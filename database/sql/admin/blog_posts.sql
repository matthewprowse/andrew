-- Andrew: Admin Blog schema reference
-- Target: MySQL 8.0+ / InnoDB / utf8mb4
--
-- Reference for the existing Laravel migration; do not execute automatically.
-- CREATE TABLE IF NOT EXISTS does not alter an existing table.

CREATE TABLE IF NOT EXISTS `blog_posts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL COMMENT 'Canonical lowercase hyphen-separated segment, without a leading slash',
    `category` VARCHAR(255) NOT NULL,
    `excerpt` LONGTEXT NOT NULL,
    `body` LONGTEXT NOT NULL COMMENT 'Plain text; blank lines separate paragraphs',
    `banner_image` VARCHAR(2048) NULL COMMENT 'Validated HTTP(S) URL or absolute site path',
    `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    `publish_date` DATE NULL COMMENT 'Required by application validation when publishing; future dates schedule visibility',
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `blog_posts_slug_unique` (`slug`),
    KEY `blog_posts_status_publish_date_id_index` (`status`, `publish_date`, `id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'CMS-managed public Insights posts';

-- Public policy, shared by index, detail and related posts:
--   * Require status = 'published' and publish_date <= today in application timezone.
--   * Sort by publish_date descending, then id descending.
--   * Draft, future-dated and missing posts return 404 on the public detail route.
--   * Related posts exclude the current post and are limited to three.
--   * Render category, excerpt and body as escaped text, preserving paragraph boundaries.
-- Banner storage is currently a URL/path field, not a media-library foreign key.
