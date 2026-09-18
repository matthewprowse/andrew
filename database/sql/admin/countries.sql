-- Andrew: Countries (service coverage) schema proposal
-- Target: MySQL 8.0+ / InnoDB / utf8mb4
--
-- This file is deliberately not a Laravel migration and must not be executed
-- automatically. Apply it after services.sql (service_country references
-- services.id).
--
-- `countries` is distinct from the `locations` table in locations.sql:
-- locations.sql models physical company offices (office_name/address/phone/
-- email). countries models the public coverage directory -- a bare name and
-- link per African country, which is what /locations and each service
-- page's "Coverage" section render from. Conflating the two would force
-- 50+ country rows to carry meaningless NULL office fields.

CREATE TABLE IF NOT EXISTS `countries` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL COMMENT 'Country name, for example "Kenya"',
    `slug` VARCHAR(255) NOT NULL COMMENT 'Canonical path segment, for example kenya -> /locations/kenya',
    `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Ascending display order',

    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_countries_slug` (`slug`),
    KEY `idx_countries_sort_order` (`sort_order`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Public directory of countries the company provides services in';

CREATE TABLE IF NOT EXISTS `service_country` (
    `service_id` BIGINT UNSIGNED NOT NULL,
    `country_id` BIGINT UNSIGNED NOT NULL,
    `sort_order` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Ascending display order within this service''s coverage list',

    PRIMARY KEY (`service_id`, `country_id`),
    KEY `idx_service_country_country` (`country_id`),
    CONSTRAINT `fk_service_country_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_service_country_country` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Pivot: which countries each service operates in';

-- Implementation notes
--
-- * There is no admin_countries audit/builder/sql agent yet. This proposal
--   exists so the Services feature has somewhere real to point its coverage
--   links; a dedicated admin Countries feature (reusing this table) is a
--   natural follow-up, not part of this pass.
-- * Public listings should order by sort_order ascending, then id.
