-- Andrew: Admin Team schema proposal
-- Target: MySQL 8.0+ / InnoDB / utf8mb4
--
-- This file is deliberately not a Laravel migration and must not be executed
-- automatically. It defines the persisted content represented by the approved
-- Team UI only.

CREATE TABLE IF NOT EXISTS `team_members` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL COMMENT 'Team member display name',
    `role` VARCHAR(255) NOT NULL COMMENT 'Public-facing job title or role',
    `bio` LONGTEXT NULL COMMENT 'Optional biography/content payload',
    `photo_media_id` BIGINT UNSIGNED NULL COMMENT 'Future media.id reference',
    `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Ascending display order',
    `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft' COMMENT 'Only published members may be rendered publicly',
    `published_at` DATETIME(6) NULL COMMENT 'Publication time; set when status becomes published',

    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    KEY `idx_team_members_public_listing` (`status`, `sort_order`, `id`),
    KEY `idx_team_members_published_at` (`published_at`),
    KEY `idx_team_members_photo_media_id` (`photo_media_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'CMS-managed team member profiles';

-- Future Media Library integration
--
-- The Media Library schema must provide media.id as BIGINT UNSIGNED in an
-- InnoDB table. Add a named foreign key from team_members.photo_media_id to
-- media.id later in a separate, explicit migration. This proposal deliberately
-- does not create, alter, or dynamically attach that foreign key.

-- Seed policy (intentionally not executable seed data):
--   * New profiles should start as status = 'draft'.
--   * Public team lists should order published profiles by sort_order, then id.
