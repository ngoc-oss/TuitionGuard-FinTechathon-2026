CREATE TABLE IF NOT EXISTS `accounts` (
	`owner` text PRIMARY KEY NOT NULL,
	`balance` integer NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL,
	`reserve` integer NOT NULL,
	`generation` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`generation` text NOT NULL,
	`invoice_key` text NOT NULL,
	`data` text NOT NULL,
	`hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `plans_owner_idx` ON `plans` (`owner`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`generation` text NOT NULL,
	`invoice_key` text NOT NULL,
	`plan_id` text NOT NULL,
	`data` text NOT NULL,
	`debit` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`settled_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `txn_invoice_once` ON `transactions` (`owner`,`generation`,`invoice_key`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `txn_plan_once` ON `transactions` (`plan_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `txn_owner_idx` ON `transactions` (`owner`);--> statement-breakpoint
