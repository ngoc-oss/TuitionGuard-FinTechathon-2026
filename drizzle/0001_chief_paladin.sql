CREATE TABLE `provider_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`generation` text NOT NULL,
	`scenario` text NOT NULL,
	`status` text NOT NULL,
	`polls` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `provider_owner_idx` ON `provider_ledger` (`owner`);