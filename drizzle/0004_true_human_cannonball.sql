CREATE TABLE `finance_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`occurred_on` text NOT NULL,
	`scope` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`fx_rate_to_mdl` real NOT NULL,
	`amount_mdl_minor` integer NOT NULL,
	`reference` text,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `finance_purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text NOT NULL,
	`product_name` text NOT NULL,
	`purchased_on` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_cost_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`fx_rate_to_mdl` real NOT NULL,
	`unit_cost_mdl_minor` integer NOT NULL,
	`supplier` text,
	`reference` text,
	`notes` text,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
