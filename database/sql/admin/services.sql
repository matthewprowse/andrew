-- Andrew Admin Services reference schema (MySQL 8+).
-- Documentation only: do not execute automatically.
-- Runtime schema: 2026_09_07_120000_create_services_table.php.
-- Andrew's public scope/FAQ/coverage contract is preserved as ordered JSON
-- arrays. Scalar edits leave omitted arrays intact. This supersedes the earlier
-- service_stats/service_sections/service_faqs proposal; those proposed tables
-- are not used by this implementation.
CREATE TABLE IF NOT EXISTS `services` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `headline` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `intro` TEXT NULL,
    `body` LONGTEXT NULL,
    `icon` VARCHAR(255) NULL,
    `banner_image` TEXT NULL COMMENT 'Legacy URL/path banner fallback when no banner_media_id is selected',
    `banner_media_id` BIGINT UNSIGNED NULL COMMENT 'Optional preferred image asset; references media.id and prevents that media record from being deleted while in use',
    `cta_text` VARCHAR(255) NULL,
    `cta_button_label` VARCHAR(255) NULL,
    `cta_link` TEXT NULL,
    `scope` JSON NULL COMMENT 'Ordered heading, optional intro, and items arrays',
    `countries` JSON NULL COMMENT 'Ordered country labels; country entity integration remains separate',
    `featured_primary` JSON NULL,
    `featured_secondary` JSON NULL,
    `faqs` JSON NULL COMMENT 'Ordered question and answer objects',
    `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
    `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
    `published_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `services_slug_unique` (`slug`),
    KEY `services_status_sort_order_index` (`status`, `sort_order`),
    KEY `services_banner_media_id_foreign` (`banner_media_id`),
    CONSTRAINT `services_banner_media_id_foreign`
        FOREIGN KEY (`banner_media_id`) REFERENCES `media` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Request validation enforces draft/published, one root URL segment with a
-- leading slash, reserved application routes, safe links and nested array shape.
-- Public queries always filter published status, including navigation.
-- A selected media-library image takes precedence over banner_image. banner_image
-- remains a validated path/HTTP(S) URL fallback for legacy service records; this
-- reference document does not provide a media upload API. Media in use by a
-- service banner cannot be deleted until the banner_media_id reference is removed.
