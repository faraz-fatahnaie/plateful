CREATE TABLE `user_accounts` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`provider` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
