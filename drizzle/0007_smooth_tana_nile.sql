PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_courses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`thumbnail_url` text,
	`is_published` integer DEFAULT false NOT NULL,
	`show_debt` integer DEFAULT false NOT NULL,
	`quote` text DEFAULT 'Thi đua là yêu nước, yêu nước phải thi đua',
	`quote_author` text DEFAULT 'Bác Hồ',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_courses`("id", "title", "description", "thumbnail_url", "is_published", "show_debt", "quote", "quote_author", "created_at", "updated_at") SELECT "id", "title", "description", "thumbnail_url", "is_published", "show_debt", "quote", "quote_author", "created_at", "updated_at" FROM `courses`;--> statement-breakpoint
DROP TABLE `courses`;--> statement-breakpoint
ALTER TABLE `__new_courses` RENAME TO `courses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_problems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`instructions` text,
	`media` text,
	`max_points` real DEFAULT 0 NOT NULL,
	`time_limit` integer,
	`attempts_allowed` integer DEFAULT -1,
	`show_answers` text DEFAULT 'after_submission' NOT NULL,
	`shuffle_questions` integer DEFAULT false NOT NULL,
	`split_screen` integer DEFAULT false NOT NULL,
	`rating` real DEFAULT 1500 NOT NULL,
	`created_by` text NOT NULL,
	`category_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_problems`("id", "title", "description", "instructions", "media", "max_points", "time_limit", "attempts_allowed", "show_answers", "shuffle_questions", "split_screen", "rating", "created_by", "category_id", "created_at", "updated_at") SELECT "id", "title", "description", "instructions", "media", "max_points", "time_limit", "attempts_allowed", "show_answers", "shuffle_questions", "split_screen", "rating", "created_by", "category_id", "created_at", "updated_at" FROM `problems`;--> statement-breakpoint
DROP TABLE `problems`;--> statement-breakpoint
ALTER TABLE `__new_problems` RENAME TO `problems`;