-- Andrew: Admin Careers schema reference
-- Target: MySQL 8.0+ / InnoDB / utf8mb4
--
-- This file is deliberately not a Laravel migration and must not be executed
-- automatically. It defines only the persisted content represented by the
-- approved Careers UI and existing Laravel migration.
-- CREATE TABLE IF NOT EXISTS does not alter an existing table.

CREATE TABLE IF NOT EXISTS `careers` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `job_title` VARCHAR(255) NOT NULL COMMENT 'Public job title',
    `description` LONGTEXT NOT NULL COMMENT 'Full job description',
    `location` VARCHAR(255) NOT NULL COMMENT 'Role location or location label',

    `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open' COMMENT 'Whether applications are currently accepted',
    `posted_date` DATE NOT NULL COMMENT 'Date the role was published',

    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    KEY `careers_status_posted_date_id_index` (`status`, `posted_date`, `id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'CMS-managed career opportunities';

-- Listing policy:
--   * Public vacancy listings should filter to status = 'open'.
--   * Sort listings by posted_date descending, then id descending.
