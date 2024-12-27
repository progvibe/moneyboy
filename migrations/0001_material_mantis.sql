CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`updatedAt` text NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
DROP TABLE `posts`;