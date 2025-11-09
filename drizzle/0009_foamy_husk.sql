CREATE TABLE `enrollment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_at` integer NOT NULL,
	`reviewed_at` integer,
	`reviewed_by` text,
	`message` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_request_user_course_idx` ON `enrollment_requests` (`user_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `enrollment_request_status_idx` ON `enrollment_requests` (`status`);--> statement-breakpoint
ALTER TABLE `courses` ADD `enrollment_mode` text DEFAULT 'hidden' NOT NULL;