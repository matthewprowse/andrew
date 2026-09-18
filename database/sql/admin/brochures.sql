-- Andrew: Admin Brochures schema proposal
-- Target: MySQL 8.0+ / InnoDB / utf8mb4
--
-- This file is deliberately not a Laravel migration and must not be executed
-- automatically. It defines only the persisted content represented by the
-- approved Brochures UI.

CREATE TABLE IF NOT EXISTS `brochures` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL COMMENT 'Public-facing brochure title',
    `description` LONGTEXT NULL COMMENT 'Optional summary shown alongside the download',
    `file_media_id` BIGINT UNSIGNED NULL COMMENT 'Future media.id reference for the uploaded file',
    `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Ascending display order',
    `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft' COMMENT 'Only published brochures may be rendered publicly',
    `published_at` DATETIME(6) NULL COMMENT 'Publication time; set when status becomes published',

    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    KEY `idx_brochures_public_listing` (`status`, `sort_order`, `id`),
    KEY `idx_brochures_published_at` (`published_at`),
    KEY `idx_brochures_file_media_id` (`file_media_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'CMS-managed downloadable brochures';

-- Future Media Library integration
--
-- The Media Library schema must provide media.id as BIGINT UNSIGNED in an
-- InnoDB table. Add a named foreign key from brochures.file_media_id to
-- media.id later in a separate, explicit migration. This proposal deliberately
-- does not create, alter, or dynamically attach that foreign key.

-- Seed policy (intentionally not executable seed data):
--   * New brochures should start as status = 'draft'.
--   * Public brochure lists should order published brochures by sort_order, then id.
