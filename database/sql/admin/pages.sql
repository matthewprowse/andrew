-- Andrew: Admin Pages schema proposal
-- Target: MySQL 8.0+ / InnoDB / utf8mb4
--
-- This file is deliberately not a Laravel migration and must not be executed
-- automatically. It may be run before the Media Library schema exists; the
-- nullable media ID columns and their indexes are deliberately independent.

CREATE TABLE IF NOT EXISTS `pages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL COMMENT 'Editor-facing page name',
    `slug` VARCHAR(255) NOT NULL COMMENT 'Canonical path: / for home, otherwise lowercase path without a trailing slash',
    `template` ENUM(
        'standard',
        'home',
        'contact',
        'locations',
        'team',
        'testimonials',
        'careers',
        'blog-list',
        'resources'
    ) NOT NULL DEFAULT 'standard' COMMENT 'Approved page layout',
    `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft' COMMENT 'Only published pages may be rendered publicly',
    `published_at` DATETIME(6) NULL COMMENT 'First/public publication time; set when status becomes published',

    `banner_media_id` BIGINT UNSIGNED NULL COMMENT 'Future media.id reference; SET NULL when the selected asset is removed',
    `body` LONGTEXT NULL COMMENT 'Page body/content payload',

    `cta_text` VARCHAR(255) NULL,
    `cta_button_label` VARCHAR(255) NULL,
    `cta_link` VARCHAR(2048) NULL COMMENT 'Internal path or absolute URL',

    `meta_title` VARCHAR(255) NULL,
    `meta_description` TEXT NULL,
    `use_custom_open_graph` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'When false, derive Open Graph metadata from the page meta fields',
    `og_title` VARCHAR(255) NULL,
    `og_description` TEXT NULL,
    `og_media_id` BIGINT UNSIGNED NULL COMMENT 'Future media.id reference; SET NULL when the selected asset is removed',

    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_pages_slug` (`slug`),
    KEY `idx_pages_status_published_at` (`status`, `published_at`),
    KEY `idx_pages_template` (`template`),
    KEY `idx_pages_banner_media_id` (`banner_media_id`),
    KEY `idx_pages_og_media_id` (`og_media_id`),
    CONSTRAINT `chk_pages_slug_format` CHECK (
        `slug` = '/'
        OR REGEXP_LIKE(
            `slug`,
            '^/[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:/[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)*$',
            'c'
        )
    )
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'CMS-managed public pages';

-- Future Media Library integration
--
-- The Media Library schema must provide:
--   media.id BIGINT UNSIGNED NOT NULL PRIMARY KEY
-- with an InnoDB table and the same integer type. Add the banner and Open
-- Graph foreign keys later in a separate, explicit migration after that table
-- exists; this standalone proposal must not create or alter them automatically.

-- Seed policy (intentionally not executable seed data):
--   * The home page must use slug '/'; uq_pages_slug permits exactly one.
--   * All other slugs must be lowercase, start with '/', contain no trailing
--     slash, and contain only lowercase letters, digits, and single hyphens
--     inside each path segment.
--   * New pages should start as status = 'draft'.
