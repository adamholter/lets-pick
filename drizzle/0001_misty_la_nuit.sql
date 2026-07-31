CREATE TABLE `rooms` (
	`room_id` text PRIMARY KEY NOT NULL,
	`item_type` text DEFAULT 'thing' NOT NULL,
	`updated_at` integer NOT NULL
);
