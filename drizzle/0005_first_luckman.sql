CREATE TABLE `type_ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`type_id` integer NOT NULL,
	`rating` real DEFAULT 1500 NOT NULL,
	`submission_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`type_id`) REFERENCES `types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `type_rating_unique_idx` ON `type_ratings` (`user_id`,`course_id`,`type_id`);--> statement-breakpoint
CREATE INDEX `type_rating_user_idx` ON `type_ratings` (`user_id`);--> statement-breakpoint
CREATE INDEX `type_rating_course_idx` ON `type_ratings` (`course_id`);--> statement-breakpoint
CREATE INDEX `type_rating_type_idx` ON `type_ratings` (`type_id`);--> statement-breakpoint
DROP INDEX `submission_user_problem_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `submission_user_problem_attempt_idx` ON `submissions` (`user_id`,`problem_id`,`attempt_number`);--> statement-breakpoint
DROP INDEX `enrollment_user_course_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_user_course_idx` ON `enrollments` (`user_id`,`course_id`);--> statement-breakpoint
ALTER TABLE `enrollments` DROP COLUMN `progress`;--> statement-breakpoint
DROP INDEX `answer_submission_question_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `answer_submission_question_idx` ON `question_answers` (`submission_id`,`question_id`);