import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getRequestEvent } from '$app/server';
import { db } from '#lib/server/db/index.ts';
import { session, user } from '#lib/server/db/schema.ts';

export type SessionUser = Omit<typeof user.$inferSelect, 'passwordHash'>;
export type Session = typeof session.$inferSelect;

const COOKIE = 'session';
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;
/** sessions used within the last half of their lifetime get extended */
const SESSION_REFRESH = SESSION_TTL / 2;

// --- passwords ---

const SCRYPT: ScryptOptions = { N: 16384, r: 16, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

function deriveKey(password: string, salt: Buffer) {
	return new Promise<Buffer>((resolve, reject) =>
		scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, SCRYPT, (err, key) =>
			err ? reject(err) : resolve(key)
		)
	);
}

export async function hashPassword(password: string) {
	const salt = randomBytes(16);
	const key = await deriveKey(password, salt);
	return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string) {
	const [salt, key] = hash.split(':');
	if (!salt || !key) return false;
	const derived = await deriveKey(password, Buffer.from(salt, 'hex'));
	const expected = Buffer.from(key, 'hex');
	return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** compared against when the email is unknown, so response times don't reveal which emails exist */
const dummyHash = hashPassword('');

/** The user for these credentials, or `null` if they are wrong. */
export async function checkCredentials(email: string, password: string) {
	const row = await db.query.user.findFirst({ where: eq(user.email, email.toLowerCase()) });
	const valid = await verifyPassword(password, row?.passwordHash ?? (await dummyHash));
	return row && valid ? row : null;
}

// --- sessions ---

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function setCookie(token: string, expiresAt: Date) {
	// SvelteKit defaults to httpOnly, sameSite=lax and secure (except on localhost)
	getRequestEvent().cookies.set(COOKIE, token, { path: '/', expires: expiresAt });
}

/** Starts a session for `userId` and sets the cookie. */
export async function createSession(userId: string) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_TTL);
	await db.insert(session).values({ id: hashToken(token), userId, expiresAt });
	setCookie(token, expiresAt);
}

/** The session from the request cookie, extending it when due. Expired and banned ones are dropped. */
export async function validateSession() {
	const { cookies } = getRequestEvent();
	const token = cookies.get(COOKIE);
	if (!token) return null;

	const id = hashToken(token);
	const row = await db.query.session.findFirst({
		where: eq(session.id, id),
		with: { user: { columns: { passwordHash: false } } }
	});
	if (!row || row.expiresAt.getTime() <= Date.now() || row.user.banned) {
		if (row) await db.delete(session).where(eq(session.id, id));
		cookies.delete(COOKIE, { path: '/' });
		return null;
	}

	const { user: sessionUser, ...current } = row;
	if (current.expiresAt.getTime() - Date.now() < SESSION_REFRESH) {
		current.expiresAt = new Date(Date.now() + SESSION_TTL);
		await db.update(session).set({ expiresAt: current.expiresAt }).where(eq(session.id, id));
		setCookie(token, current.expiresAt);
	}

	return { session: current, user: sessionUser satisfies SessionUser };
}

/** Ends the current session and clears the cookie. */
export async function invalidateSession() {
	const { cookies } = getRequestEvent();
	const token = cookies.get(COOKIE);
	if (token) await db.delete(session).where(eq(session.id, hashToken(token)));
	cookies.delete(COOKIE, { path: '/' });
}

/** Signs a user out everywhere, e.g. when deactivated. */
export async function invalidateUserSessions(userId: string) {
	await db.delete(session).where(eq(session.userId, userId));
}

// --- rate limiting ---

const attempts = new Map<string, { count: number; resetAt: number }>();

/** `false` once `key` was seen more than `max` times within `windowMs`. In memory, so per process. */
export function rateLimit(key: string, max = 5, windowMs = 60_000) {
	const now = Date.now();
	const entry = attempts.get(key);
	if (!entry || entry.resetAt <= now) {
		if (attempts.size > 10_000) {
			for (const [k, v] of attempts) if (v.resetAt <= now) attempts.delete(k);
		}
		attempts.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}
	return ++entry.count <= max;
}
