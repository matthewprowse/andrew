-- Andrew: Admin Testimonials schema proposal
-- Target: MySQL 8.0+ / InnoDB / utf8mb4
--
-- This file is deliberately not a Laravel migration and must not be executed
-- automatically. It defines only the persisted content represented by the
-- approved Testimonials UI.
--
-- Apply after services.sql: service_id references services.id.

CREATE TABLE IF NOT EXISTS `testimonials` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `quote` LONGTEXT NOT NULL COMMENT 'Public testimonial quotation',
    `author` VARCHAR(255) NOT NULL COMMENT 'Person who supplied the testimonial',
    `company` VARCHAR(255) NULL COMMENT 'Optional company or organisation name',
    `service_id` BIGINT UNSIGNED NULL COMMENT 'Optional service this testimonial is scoped to; NULL testimonials only appear on the general Testimonials page',

    `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Ascending display order',
    `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft' COMMENT 'Only published testimonials may be rendered publicly',
    `published_at` DATETIME(6) NULL COMMENT 'Publication time; set when status becomes published',

    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    KEY `idx_testimonials_public_listing` (`status`, `sort_order`, `id`),
    KEY `idx_testimonials_published_at` (`published_at`),
    KEY `idx_testimonials_service_id` (`service_id`),
    CONSTRAINT `fk_testimonials_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'CMS-managed public testimonials';

-- Seed policy (intentionally not executable seed data):
--   * New testimonials should start as status = 'draft'.
--   * Public testimonial lists should query status = 'published' and order by
--     sort_order, then id.
--   * A service page should prefer a published testimonial where
--     service_id matches it (ordered by sort_order, then id) and fall back
--     to a general (service_id IS NULL) testimonial if none exists.
