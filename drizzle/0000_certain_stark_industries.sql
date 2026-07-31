CREATE TABLE `room_presence` (
	`room_id` text NOT NULL,
	`client_id` text NOT NULL,
	`avatar_key` text NOT NULL,
	`color_key` text NOT NULL,
	`profile_id` text,
	`profile_key` text,
	`profile_content_type` text,
	`last_seen` integer NOT NULL,
	PRIMARY KEY(`room_id`, `client_id`)
);
--> statement-breakpoint
CREATE INDEX `room_presence_active_idx` ON `room_presence` (`room_id`,`last_seen`);--> statement-breakpoint
CREATE UNIQUE INDEX `room_presence_profile_id_idx` ON `room_presence` (`profile_id`);