CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`author_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `course_problems` (
	`course_id` text NOT NULL,
	`problem_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`course_id`, `problem_id`),
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `course_problems_course_idx` ON `course_problems` (`course_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`thumbnail_url` text,
	`instructor_id` text NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`instructor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`enrolled_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `enrollment_user_course_idx` ON `enrollments` (`user_id`,`course_id`);--> statement-breakpoint
CREATE TABLE `problem_types` (
	`problem_id` text NOT NULL,
	`type_id` integer NOT NULL,
	`assigned_at` integer NOT NULL,
	PRIMARY KEY(`problem_id`, `type_id`),
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`type_id`) REFERENCES `types`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `problem_types_problem_idx` ON `problem_types` (`problem_id`);--> statement-breakpoint
CREATE INDEX `problem_types_type_idx` ON `problem_types` (`type_id`);--> statement-breakpoint
CREATE TABLE `problems` (
	`id` text PRIMARY KEY NOT NULL,
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
	`created_by` text NOT NULL,
	`category_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `question_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`question_id` text NOT NULL,
	`answer_data` text,
	`is_correct` integer,
	`points_earned` real DEFAULT 0 NOT NULL,
	`points_possible` real NOT NULL,
	`auto_graded` integer DEFAULT true NOT NULL,
	`feedback` text,
	`answered_at` integer NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `answer_submission_question_idx` ON `question_answers` (`submission_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`problem_id` text NOT NULL,
	`question_type` text NOT NULL,
	`question_text` text NOT NULL,
	`explanation` text,
	`points` real DEFAULT 0 NOT NULL,
	`order_index` integer NOT NULL,
	`is_required` integer DEFAULT true NOT NULL,
	`config` text,
	`media` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `question_problem_order_idx` ON `questions` (`problem_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`problem_id` text NOT NULL,
	`attempt_number` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`max_score` real NOT NULL,
	`score_percentage` real DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`submitted_at` integer,
	`graded_at` integer,
	`time_spent` integer,
	`auto_graded` integer DEFAULT true NOT NULL,
	`graded_by` text,
	`feedback` text,
	`is_late` integer DEFAULT false NOT NULL,
	`is_flagged` integer DEFAULT false NOT NULL,
	`flag_reason` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`graded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `submission_user_problem_idx` ON `submissions` (`user_id`,`problem_id`);--> statement-breakpoint
CREATE INDEX `submission_status_idx` ON `submissions` (`status`);--> statement-breakpoint
CREATE TABLE `types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `types_name_unique` ON `types` (`name`);--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `last_login_at` integer;