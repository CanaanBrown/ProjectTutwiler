-- db_seed.sql
USE mission_control_db;

-- Reset core tables (dev only!)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE decisions;
TRUNCATE TABLE alerts;
TRUNCATE TABLE asset_map;
TRUNCATE TABLE users;
TRUNCATE TABLE sites;
SET FOREIGN_KEY_CHECKS = 1;

-- Sites
INSERT INTO sites (
    site_id, name, sector, location, verified,
    quiet_mode_enabled, quiet_mode_schedule
) VALUES
(1, 'Riverside Community Hospital', 'Healthcare - Hospital', 'Birmingham, AL', 1, 1, '22:00-06:00'),
(2, 'Greenfield Diagnostics Lab', 'Healthcare - Lab', 'Tuscaloosa, AL', 1, 0, NULL);

-- Users
INSERT INTO users (
    user_id, site_id, name, email, role
) VALUES
(1, 1, 'Alex Nguyen', 'alex.nguyen@riverside.org', 'IT Security Lead'),
(2, 1, 'Jordan Reed', 'jordan.reed@riverside.org', 'Clinical Engineering'),
(3, 2, 'Sam Patel', 'sam.patel@greenfieldlab.com', 'Lab Director'),
(4, 2, 'Morgan Ellis', 'morgan.ellis@greenfieldlab.com', 'Biosecurity Officer');

-- Assets
INSERT INTO asset_map (
    asset_id, site_id, product_vendor, product_name,
    model, version, in_production, has_ingest_feed, last_verified
) VALUES
(1, 1, 'Meditech Systems', 'Lab Blood Analyzer Controller', 'LX-400', '3.2.1', 1, 1, '2025-10-10'),
(2, 1, 'Nova Health', 'Outpatient Check-in Kiosk', 'KIOSK-10', '1.4.0', 1, 1, '2025-10-15'),
(3, 1, 'CityNet', 'Public Website CMS', 'CityWeb', '2.0.0', 1, 0, '2025-09-20'),
(4, 2, 'BioTrack', 'Freezer Temperature Monitor', 'FT-200', '5.0.2', 1, 1, '2025-11-01'),
(5, 2, 'GeneSys', 'PCR Workflow Station', 'PCR-900', '7.3.0', 1, 0, '2025-10-28');

-- Alerts
INSERT INTO alerts (
    alert_id, site_id, title, description, tlp,
    impact_band, status, is_applicable, affected_function,
    current_decision, detected_at
) VALUES
-- 1: Top RED ACTIVE
(1, 1,
 'Critical: Controller X firmware vuln (no patch)',
 'Remote code execution vuln in LX-400 controllers; vendor has not released a patch. Interim mitigation required.',
 'TLP:AMBER',
 'RED',
 'ACTIVE',
 1,
 'Lab diagnostics',
 NULL,
 NOW() - INTERVAL 30 MINUTE),

-- 2: YELLOW ACTIVE (HOLD)
(2, 1,
 'Suspicious outbound traffic from kiosk subnet',
 'Check-in kiosks observed beaconing to unfamiliar IP range. Traffic currently rate-limited.',
 'TLP:GREEN',
 'YELLOW',
 'ACTIVE',
 1,
 'Patient intake',
 'HOLD',
 NOW() - INTERVAL 3 HOUR),

-- 3: GREEN RESOLVED (GO)
(3, 1,
 'Outdated browser on public info terminals',
 'Kiosks in lobby running one major version behind; patched during maintenance window.',
 'TLP:GREEN',
 'GREEN',
 'RESOLVED',
 1,
 'Public communications',
 'GO',
 NOW() - INTERVAL 2 DAY),

-- 4: RED RESOLVED (ESCALATE)
(4, 2,
 'Freezer monitor offline in BSL-2 wing',
 'Continuous temperature monitoring lost for freezer bank F2; manual checks in place, root cause investigated.',
 'TLP:AMBER',
 'RED',
 'RESOLVED',
 1,
 'Cold-chain storage',
 'ESCALATE',
 NOW() - INTERVAL 1 DAY),

-- 5: YELLOW SUPPRESSED (non-applicable)
(5, 2,
 'VPN client vuln on Windows 7 endpoints',
 'Legacy VPN client vuln; site has no remaining Windows 7 assets in production.',
 'TLP:GREEN',
 'YELLOW',
 'SUPPRESSED',
 0,
 'Remote access',
 'GO',
 NOW() - INTERVAL 5 DAY),

-- 6: GREEN ACTIVE (low impact)
(6, 2,
 'Generic phishing campaign targeting lab staff',
 'Credential phishing campaign observed; no successful logins detected; awareness reminder sent.',
 'TLP:CLEAR',
 'GREEN',
 'ACTIVE',
 1,
 'Staff communication',
 NULL,
 NOW() - INTERVAL 4 HOUR);

-- Decisions
INSERT INTO decisions (
    decision_id, alert_id, user_id, action, notes, created_at
) VALUES
(1, 2, 1, 'HOLD',
 'Rate-limiting in place; waiting on additional logs from network team.',
 NOW() - INTERVAL 2 HOUR),

(2, 3, 2, 'GO',
 'Patched all affected browsers and confirmed via inventory scan.',
 NOW() - INTERVAL 1 DAY),

(3, 4, 3, 'ESCALATE',
 'Escalated to facilities + vendor; temporary manual checks logged every 30 minutes.',
 NOW() - INTERVAL 20 HOUR),

(4, 5, 4, 'GO',
 'Confirmed no Win7 endpoints remain; marking alert as non-applicable.',
 NOW() - INTERVAL 4 DAY);
