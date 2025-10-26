PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`fullname` text,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`permissions` text DEFAULT '0' NOT NULL,
	`bio` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`date_of_birth` text,
	`last_login_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "username", "fullname", "email", "password_hash", "permissions", "bio", "created_at", "updated_at", "date_of_birth", "last_login_at") SELECT "id", "username", "fullname", "email", "password_hash", "permissions", "bio", "created_at", "updated_at", "date_of_birth", "last_login_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);