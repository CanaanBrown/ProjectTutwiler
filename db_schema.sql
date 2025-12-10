-- db_schema.sql
CREATE DATABASE IF NOT EXISTS mission_control_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mission_control_db;

-- SITES
CREATE TABLE IF NOT EXISTS sites (
  site_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sector VARCHAR(255) NULL,
  location VARCHAR(255) NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  quiet_mode_enabled TINYINT(1) NOT NULL DEFAULT 0,
  quiet_mode_schedule VARCHAR(50) NULL
) ENGINE=InnoDB;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  role VARCHAR(255) NULL,
  CONSTRAINT fk_users_site
    FOREIGN KEY (site_id) REFERENCES sites(site_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ASSET MAP
CREATE TABLE IF NOT EXISTS asset_map (
  asset_id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  product_vendor VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  model VARCHAR(100) NULL,
  version VARCHAR(100) NULL,
  in_production TINYINT(1) NOT NULL DEFAULT 1,
  has_ingest_feed TINYINT(1) NOT NULL DEFAULT 0,
  last_verified DATE NULL,
  CONSTRAINT fk_assets_site
    FOREIGN KEY (site_id) REFERENCES sites(site_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  alert_id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NULL,
  tlp VARCHAR(50) NULL,
  impact_band VARCHAR(20) NULL,       -- RED / YELLOW / GREEN
  status VARCHAR(20) NOT NULL,        -- ACTIVE / RESOLVED / SUPPRESSED
  is_applicable TINYINT(1) NOT NULL DEFAULT 1,
  affected_function VARCHAR(255) NULL,
  current_decision VARCHAR(20) NULL,  -- GO / HOLD / ESCALATE (latest)
  detected_at DATETIME NULL,
  CONSTRAINT fk_alerts_site
    FOREIGN KEY (site_id) REFERENCES sites(site_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- DECISIONS
CREATE TABLE IF NOT EXISTS decisions (
  decision_id INT AUTO_INCREMENT PRIMARY KEY,
  alert_id INT NOT NULL,
  user_id INT NOT NULL,
  action VARCHAR(20) NOT NULL,        -- GO / HOLD / ESCALATE
  notes TEXT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_decisions_alert
    FOREIGN KEY (alert_id) REFERENCES alerts(alert_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_decisions_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- PATCHES
CREATE TABLE IF NOT EXISTS patches (
  patch_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  cve VARCHAR(100) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, APPLIED, FAILED
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  affected_systems TEXT NULL,
  notes TEXT NULL,
  site_id INT NULL,
  CONSTRAINT fk_patches_site
    FOREIGN KEY (site_id) REFERENCES sites(site_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- CONTROLS
CREATE TABLE IF NOT EXISTS controls (
  control_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'DETECTIVE',  -- PREVENTIVE, DETECTIVE, CORRECTIVE
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',    -- ACTIVE, INACTIVE
  effectiveness INT NOT NULL DEFAULT 0,            -- 0-100
  description TEXT NULL,
  site_id INT NULL,
  CONSTRAINT fk_controls_site
    FOREIGN KEY (site_id) REFERENCES sites(site_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;