-- Andrew: Admin Media Library schema proposal
-- Target: MySQL 8.0+ / InnoDB / utf8mb4
--
-- This file is deliberately not a Laravel migration and must not be executed
-- automatically. It defines the persisted content represented by the approved
-- Media Library UI.

CREATE TABLE IF NOT EXISTS `media` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `file_name` VARCHAR(255) NOT NULL COMMENT 'Original uploaded file name',
    `alt_text` VARCHAR(255) NULL COMMENT 'Accessibility/description text for the file',
    `file_path` VARCHAR(512) NOT NULL COMMENT 'Public storage path to the uploaded file',
    `uploaded_at` DATE NOT NULL COMMENT 'Date the file was uploaded',

    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    KEY `idx_media_uploaded_at` (`uploaded_at`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Uploaded file library, referenced by other admin features (team photos, brochure files, etc.)';

-- Dependency note:
--   * database/sql/admin/team.sql (team_members.photo_media_id) and
--     database/sql/admin/brochures.sql (brochures.file_media_id) were written before this
--     table existed and deliberately left their foreign keys unattached. Once this table
--     is applied, wire those columns to media.id via a real, explicit Laravel migration —
--     do not retrofit the foreign key into those proposal files.

-- Seed policy (intentionally not executable seed data):
--   * Public references to a media item should resolve via id; there is no publish/draft
--     state on media itself, since visibility is governed by the feature that references it.
