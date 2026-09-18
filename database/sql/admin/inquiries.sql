-- Andrew: Admin Inquiries schema proposal
-- Target: MySQL 8.0+ / InnoDB / utf8mb4
--
-- This file is deliberately not a Laravel migration and must not be executed
-- automatically. It defines the persisted content represented by the approved
-- Inquiries UI (Leads and Resource Requests tabs).
-- Leads reflects the existing Laravel migrations; Resource Requests remains a proposal.
-- CREATE TABLE IF NOT EXISTS does not alter an existing table.

CREATE TABLE IF NOT EXISTS `leads` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `type` ENUM('contact', 'quote') NOT NULL DEFAULT 'contact' COMMENT 'Which public form the lead came from',
    `name` VARCHAR(255) NULL COMMENT 'Submitted name; absent on email-only estimator requests',
    `email` VARCHAR(255) NOT NULL COMMENT 'Submitted email (untrusted public input)',
    `subject` VARCHAR(255) NULL COMMENT 'Contact subject; absent on email-only estimator requests',
    `message` TEXT NULL COMMENT 'Submitted message body; absent on email-only estimator requests',
    `handled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Staff-toggled triage flag',
    `submitted_at` TIMESTAMP NOT NULL COMMENT 'When the public form was submitted',

    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    KEY `leads_handled_submitted_at_index` (`handled`, `submitted_at`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Public contact/quote form submissions, reviewed via the Inquiries admin';

CREATE TABLE IF NOT EXISTS `resource_requests` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `brochure_id` BIGINT UNSIGNED NULL COMMENT 'References brochures.id; NULL if the source brochure was later deleted',
    `name` VARCHAR(255) NOT NULL COMMENT 'Submitted requester name (untrusted public input)',
    `email` VARCHAR(255) NOT NULL COMMENT 'Submitted requester email (untrusted public input)',
    `company` VARCHAR(255) NULL COMMENT 'Optional submitted company name (untrusted public input)',
    `submitted_at` DATETIME(6) NOT NULL COMMENT 'When the public download form was submitted',

    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    KEY `idx_resource_requests_submitted_at` (`submitted_at`),
    KEY `idx_resource_requests_brochure_id` (`brochure_id`),
    CONSTRAINT `fk_resource_requests_brochure`
        FOREIGN KEY (`brochure_id`) REFERENCES `brochures` (`id`)
        ON DELETE SET NULL
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Brochure download requests captured from the public site, reviewed via the Inquiries admin';

-- Listing policy:
--   * Leads should default-sort by submitted_at descending; unhandled leads should surface first in the UI.
--   * Resource Requests should default-sort by submitted_at descending.
--   * Leads are populated by public-facing forms; Resource Requests capture is not implemented yet.
--   * Treat name/email/subject/message/company as untrusted
--     input requiring standard output escaping when rendered in the admin UI.

-- Dependency note:
--   * fk_resource_requests_brochure assumes database/sql/admin/brochures.sql has already been applied
--     (creates the `brochures` table this proposal references). Apply brochures.sql first.
