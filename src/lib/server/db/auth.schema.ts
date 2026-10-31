import { relations, sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const USER_ROLES = ['admin', 'user'] as const;

export const user = sqliteTable('user', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	/** stored lowercased */
	email: text('email').notNull().unique(),
	/** scrypt, `salt:hash` in hex */
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: USER_ROLES }).notNull().default('user'),
	/** deactivated by an admin, can't sign in */
	banned: integer('banned', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull()
});

export const session = sqliteTable(
	'session',
	{
		/** sha256 of the cookie token, so a leaked database can't be used to sign in */
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	})
}));
