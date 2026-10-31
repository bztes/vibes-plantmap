import { count, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { appSetting, user } from '#lib/server/db/schema.ts';

export async function countUsers() {
	const [row] = await db.select({ value: count() }).from(user);
	return row?.value ?? 0;
}

export async function isSignupEnabled() {
	const row = await db.query.appSetting.findFirst({ where: eq(appSetting.key, 'signupEnabled') });
	return row ? row.value === 'true' : true;
}

export async function setSignupEnabled(enabled: boolean) {
	await db
		.insert(appSetting)
		.values({ key: 'signupEnabled', value: String(enabled) })
		.onConflictDoUpdate({ target: appSetting.key, set: { value: String(enabled) } });
}
