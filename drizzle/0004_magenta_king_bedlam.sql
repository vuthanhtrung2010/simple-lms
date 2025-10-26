ALTER TABLE `courses` ADD `show_debt` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `quote` text DEFAULT 'Thi đua là yêu nước, yêu nước phải thi đua';--> statement-breakpoint
ALTER TABLE `courses` ADD `quote_author` text DEFAULT 'Bác Hồ';