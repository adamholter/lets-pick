CREATE TABLE `room_items` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`text` text NOT NULL,
	`votes` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `room_items_room_idx` ON `room_items` (`room_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `room_votes` (
	`room_id` text NOT NULL,
	`item_id` text NOT NULL,
	`client_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`item_id`, `client_id`)
);
--> statement-breakpoint
CREATE INDEX `room_votes_room_item_idx` ON `room_votes` (`room_id`,`item_id`);