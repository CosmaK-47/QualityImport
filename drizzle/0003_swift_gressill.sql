CREATE TABLE `reseller_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_name` text NOT NULL,
	`business_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`country` text NOT NULL,
	`city` text NOT NULL,
	`business_type` text NOT NULL,
	`website` text,
	`monthly_volume` text NOT NULL,
	`categories` text NOT NULL,
	`registration_id` text,
	`message` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reseller_package` text DEFAULT 'none' NOT NULL,
	`custom_discount` integer,
	`internal_notes` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reseller_events` (
	`id` text PRIMARY KEY NOT NULL,
	`reseller_id` text NOT NULL,
	`event` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`reseller_id`) REFERENCES `reseller_applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_language` text;