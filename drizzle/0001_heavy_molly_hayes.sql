ALTER TABLE `orders` ADD `payment_status` text DEFAULT 'setup_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_provider` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_reference` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_url` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_method` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_expires_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `paid_at` text;