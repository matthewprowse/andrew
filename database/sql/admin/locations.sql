-- Andrew: Admin Locations schema reference
-- Target: MySQL 8.0+ / InnoDB / utf8mb4
--
-- This file is deliberately not a Laravel migration and must not be executed
-- automatically. It defines only the persisted content represented by the
-- approved Locations UI and existing Laravel migration.
-- CREATE TABLE IF NOT EXISTS does not alter an existing table.

CREATE TABLE IF NOT EXISTS `locations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `office_name` VARCHAR(255) NOT NULL COMMENT 'Public-facing office name',
    `address` LONGTEXT NOT NULL COMMENT 'Full postal or street address',
    `phone` VARCHAR(64) NULL COMMENT 'Public contact telephone number',
    `email` VARCHAR(255) NULL COMMENT 'Public contact email address',
    `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Ascending display order',

    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    KEY `locations_sort_order_id_index` (`sort_order`, `id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'CMS-managed office and branch locations';

-- Listing policy:
--   * Public location lists should order by sort_order ascending, then id.
--   * Admin filtering and sorting currently run in the existing client-side table.
