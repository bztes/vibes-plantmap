CREATE TABLE `tree_measurement` (
	`id` text PRIMARY KEY NOT NULL,
	`tree_id` text NOT NULL,
	`measured_at` text NOT NULL,
	`height` real,
	`spread` real,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`tree_id`) REFERENCES `tree`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tree_measurement_tree_idx` ON `tree_measurement` (`tree_id`);--> statement-breakpoint
-- the size at planting becomes the first measurement, planned trees count as planted today
INSERT INTO `tree_measurement` (`id`, `tree_id`, `measured_at`, `height`, `spread`)
SELECT lower(hex(randomblob(16))), `id`, min(`planted_at`, date('now')), `height_at_planting`, `spread_at_planting` FROM `tree`;--> statement-breakpoint
ALTER TABLE `tree` DROP COLUMN `planted_at`;--> statement-breakpoint
ALTER TABLE `tree` DROP COLUMN `height_at_planting`;--> statement-breakpoint
ALTER TABLE `tree` DROP COLUMN `spread_at_planting`;