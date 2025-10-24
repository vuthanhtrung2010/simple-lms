import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	username: text('username').notNull().unique(),
	fullname: text('fullname'),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	permissions: integer('permissions').notNull().default(0),
	createdAt: integer('created_at')
		.notNull()
		.$defaultFn(() => Date.now()),
	updatedAt: integer('updated_at')
		.notNull()
		.$defaultFn(() => Date.now())
		.$onUpdate(() => Date.now()),
	dob: text('date_of_birth')
});

export const sessions = sqliteTable('sessions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at')
		.notNull()
		.$defaultFn(() => Date.now()),
	expiresAt: integer('expires_at')
		.notNull()
		.$defaultFn(() => Date.now() + 7 * 24 * 60 * 60 * 1000) // Default to 7 days
});
