-- Andrew: Admin Estimator schema proposal
-- Target: MySQL 8.0+ / InnoDB / utf8mb4
--
-- This file is deliberately not a Laravel migration and must not be executed
-- automatically. It defines the persisted content represented by the approved
-- Estimator admin screens (Services, Cities, City Service Rates, Destination
-- Costs, Intra-Location Costs) and the public relocation planner that reads
-- them. Catalogue Control and the Overview screen are read-only aggregates of
-- these tables and do not need tables of their own.
--
-- All rate figures currently on screen are generated placeholders (see
-- EstimatorRateSeeder) — this schema
-- defines where real rates get captured, it does not claim the current
-- figures are real quotes.

CREATE TABLE IF NOT EXISTS `estimator_services` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `category` ENUM('costs', 'services') NOT NULL COMMENT 'Costs = the move itself; services = destination support',
    `name` VARCHAR(255) NOT NULL COMMENT 'Public-facing service name; also the key services-pricing edits by',
    `description` TEXT NULL COMMENT 'Shown under the service name on the public planner',
    `selected_by_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Pre-ticked on the public planner',
    `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Inactive services are hidden from the public planner',
    `tiered_pricing` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Services category only: rate adjusts by party size',
    `first_threshold` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'People count above which adjustment_above_threshold applies',
    `adjustment_above_threshold` SMALLINT NOT NULL DEFAULT 0 COMMENT 'Percent adjustment above first_threshold',
    `next_threshold` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'People count above which adjustment_above_next_threshold applies',
    `adjustment_above_next_threshold` SMALLINT NOT NULL DEFAULT 0 COMMENT 'Percent adjustment above next_threshold',

    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_estimator_services_name` (`name`),
    KEY `idx_estimator_services_category_active` (`category`, `active`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Estimator service catalogue, shared by the admin grids and the public planner';

CREATE TABLE IF NOT EXISTS `estimator_cities` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `city` VARCHAR(255) NOT NULL,
    `country` VARCHAR(255) NOT NULL,
    `continent` VARCHAR(64) NOT NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'inactive' COMMENT 'Only active cities carry rates and appear on the public planner',

    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    KEY `idx_estimator_cities_status` (`status`),
    KEY `idx_estimator_cities_country` (`country`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Estimator city list, shared by the admin grids and the public planner';

CREATE TABLE IF NOT EXISTS `estimator_relocation_service_rates` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `city_id` BIGINT UNSIGNED NOT NULL COMMENT 'Destination city the rate applies to',
    `service_id` BIGINT UNSIGNED NOT NULL COMMENT 'Must reference an estimator_services row with category = services',
    `rate_usd` DECIMAL(10, 2) NULL COMMENT 'NULL means no rate captured; planner shows "Price required"',

    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_relocation_service_rate` (`city_id`, `service_id`),
    KEY `idx_relocation_service_rates_service` (`service_id`),
    CONSTRAINT `fk_relocation_service_rates_city`
        FOREIGN KEY (`city_id`) REFERENCES `estimator_cities` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_relocation_service_rates_service`
        FOREIGN KEY (`service_id`) REFERENCES `estimator_services` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'City Service Rates admin screen: destination-services base rate per city';

CREATE TABLE IF NOT EXISTS `estimator_destination_rates` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `city_id` BIGINT UNSIGNED NOT NULL COMMENT 'Destination city the rate applies to',
    `service_id` BIGINT UNSIGNED NOT NULL COMMENT 'Must reference an estimator_services row with category = costs',
    `rate_usd` DECIMAL(10, 2) NULL COMMENT 'NULL means no rate captured; planner shows "Price required"',

    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_destination_rate` (`city_id`, `service_id`),
    KEY `idx_destination_rates_service` (`service_id`),
    CONSTRAINT `fk_destination_rates_city`
        FOREIGN KEY (`city_id`) REFERENCES `estimator_cities` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_destination_rates_service`
        FOREIGN KEY (`service_id`) REFERENCES `estimator_services` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Destination Costs admin screen: flat per-destination cost, not route-dependent';

CREATE TABLE IF NOT EXISTS `estimator_route_rates` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `origin_city_id` BIGINT UNSIGNED NOT NULL,
    `destination_city_id` BIGINT UNSIGNED NOT NULL,
    `service_id` BIGINT UNSIGNED NOT NULL COMMENT 'Must reference an estimator_services row with category = costs',
    `economy_rate_usd` DECIMAL(10, 2) NULL,
    `business_rate_usd` DECIMAL(10, 2) NULL,

    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_route_rate` (`origin_city_id`, `destination_city_id`, `service_id`),
    KEY `idx_route_rates_service` (`service_id`),
    KEY `idx_route_rates_destination` (`destination_city_id`),
    CONSTRAINT `fk_route_rates_origin`
        FOREIGN KEY (`origin_city_id`) REFERENCES `estimator_cities` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_route_rates_destination`
        FOREIGN KEY (`destination_city_id`) REFERENCES `estimator_cities` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_route_rates_service`
        FOREIGN KEY (`service_id`) REFERENCES `estimator_services` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Intra-Location Costs admin screen: route-dependent rate, two service levels';

CREATE TABLE IF NOT EXISTS `estimator_settings` (
    `id` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Single-row settings table; always id = 1',
    `currency` CHAR(3) NOT NULL DEFAULT 'USD',
    `vat_rate` DECIMAL(5, 4) NOT NULL DEFAULT 0.1500 COMMENT 'Applied to the whole estimate',
    `contingency_rate` DECIMAL(5, 4) NOT NULL DEFAULT 0.1000 COMMENT 'Applied to move costs only',
    `validity_days` SMALLINT UNSIGNED NOT NULL DEFAULT 90,

    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`),
    CONSTRAINT `chk_estimator_settings_singleton` CHECK (`id` = 1)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci
  COMMENT = 'Global estimator settings (currency, VAT, contingency, validity) — always exactly one row';

-- Notes:
--   * Route-priced services (Flights, Household Goods Shipping, Transit Insurance, Pet Relocation)
--     are captured in estimator_route_rates only; the equivalent rows the current UI also shows for
--     them under Destination Costs are unused duplicates in the reference implementation and should
--     not be persisted twice — see ROUTE_PRICED in App\Services\EstimatorCalculator.
--   * A NULL rate is a valid, meaningful state ("no rate captured yet"), not an error — the public
--     planner already renders this as "Price required" and excludes it from the total.
--   * Party-size and other move-shape adjustments (bedrooms, weeks, container size, pet count) are
--     applied in application code against the unit rates above; they are not persisted separately.

-- Seed policy (intentionally not executable seed data):
--   * New cities should start as status = 'inactive'.
--   * estimator_settings should be seeded with exactly one row (id = 1) on first migration.
