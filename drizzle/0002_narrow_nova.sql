CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`marketing_consent` integer DEFAULT false NOT NULL,
	`marketing_consent_at` text,
	`first_order_at` text NOT NULL,
	`last_order_at` text NOT NULL,
	`order_count` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_email` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_phone` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_details` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `confirmation_email_status` text DEFAULT 'not_configured' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `confirmation_email_id` text;