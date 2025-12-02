using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using MySqlConnector;
using MissionControl.Api.Models;

namespace MissionControl.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MetricsController : ControllerBase
    {
        private readonly IConfiguration _config;

        public MetricsController(IConfiguration config)
        {
            _config = config;
        }

        private MySqlConnection CreateConnection()
        {
            var connString = _config.GetConnectionString("MissionControlDb");
            return new MySqlConnection(connString);
        }

        // GET: api/metrics/overview?siteId=1
        [HttpGet("overview")]
        public async Task<ActionResult<MetricsOverview>> GetOverview([FromQuery] int? siteId = null)
        {
            var result = new MetricsOverview();

            using var conn = CreateConnection();
            await conn.OpenAsync();

            // 1) Alerts by impact band
            var alertsBandSql = @"
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN impact_band = 'RED' THEN 1 ELSE 0 END) AS red,
                    SUM(CASE WHEN impact_band = 'YELLOW' THEN 1 ELSE 0 END) AS yellow,
                    SUM(CASE WHEN impact_band = 'GREEN' THEN 1 ELSE 0 END) AS green
                FROM alerts";

            if (siteId.HasValue)
            {
                alertsBandSql += " WHERE site_id = @siteId;";
            }
            else
            {
                alertsBandSql += ";";
            }

            using (var cmd = new MySqlCommand(alertsBandSql, conn))
            {
                if (siteId.HasValue)
                {
                    cmd.Parameters.AddWithValue("@siteId", siteId.Value);
                }

                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    int totalOrd = reader.GetOrdinal("total");
                    int redOrd = reader.GetOrdinal("red");
                    int yellowOrd = reader.GetOrdinal("yellow");
                    int greenOrd = reader.GetOrdinal("green");

                    result.TotalAlerts = reader.IsDBNull(totalOrd) ? 0 : reader.GetInt32(totalOrd);
                    result.RedAlerts = reader.IsDBNull(redOrd) ? 0 : reader.GetInt32(redOrd);
                    result.YellowAlerts = reader.IsDBNull(yellowOrd) ? 0 : reader.GetInt32(yellowOrd);
                    result.GreenAlerts = reader.IsDBNull(greenOrd) ? 0 : reader.GetInt32(greenOrd);
                }
            }

            // 2) Alerts by status
            var alertsStatusSql = @"
                SELECT
                    SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeCount,
                    SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolvedCount,
                    SUM(CASE WHEN status = 'SUPPRESSED' THEN 1 ELSE 0 END) AS suppressedCount
                FROM alerts";

            if (siteId.HasValue)
            {
                alertsStatusSql += " WHERE site_id = @siteId;";
            }
            else
            {
                alertsStatusSql += ";";
            }

            using (var cmd = new MySqlCommand(alertsStatusSql, conn))
            {
                if (siteId.HasValue)
                {
                    cmd.Parameters.AddWithValue("@siteId", siteId.Value);
                }

                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    int activeOrd = reader.GetOrdinal("activeCount");
                    int resolvedOrd = reader.GetOrdinal("resolvedCount");
                    int suppressedOrd = reader.GetOrdinal("suppressedCount");

                    result.ActiveAlerts = reader.IsDBNull(activeOrd) ? 0 : reader.GetInt32(activeOrd);
                    result.ResolvedAlerts = reader.IsDBNull(resolvedOrd) ? 0 : reader.GetInt32(resolvedOrd);
                    result.SuppressedAlerts = reader.IsDBNull(suppressedOrd) ? 0 : reader.GetInt32(suppressedOrd);
                }
            }

            // 3) Decisions summary (filtered by site via alerts)
            var decisionsSql = @"
                SELECT
                    SUM(CASE WHEN d.action = 'GO' THEN 1 ELSE 0 END) AS goCount,
                    SUM(CASE WHEN d.action = 'HOLD' THEN 1 ELSE 0 END) AS holdCount,
                    SUM(CASE WHEN d.action = 'ESCALATE' THEN 1 ELSE 0 END) AS escalateCount,
                    MAX(d.created_at) AS lastDecisionAt
                FROM decisions d
                JOIN alerts a ON d.alert_id = a.alert_id";

            if (siteId.HasValue)
            {
                decisionsSql += " WHERE a.site_id = @siteId;";
            }
            else
            {
                decisionsSql += ";";
            }

            using (var cmd = new MySqlCommand(decisionsSql, conn))
            {
                if (siteId.HasValue)
                {
                    cmd.Parameters.AddWithValue("@siteId", siteId.Value);
                }

                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    int goOrd = reader.GetOrdinal("goCount");
                    int holdOrd = reader.GetOrdinal("holdCount");
                    int escalateOrd = reader.GetOrdinal("escalateCount");
                    int lastOrd = reader.GetOrdinal("lastDecisionAt");

                    result.GoDecisions = reader.IsDBNull(goOrd) ? 0 : reader.GetInt32(goOrd);
                    result.HoldDecisions = reader.IsDBNull(holdOrd) ? 0 : reader.GetInt32(holdOrd);
                    result.EscalateDecisions = reader.IsDBNull(escalateOrd) ? 0 : reader.GetInt32(escalateOrd);

                    if (!reader.IsDBNull(lastOrd))
                    {
                        result.LastDecisionAt = reader.GetDateTime(lastOrd);
                    }
                }
            }

            // 4) Asset coverage
            var assetsSql = @"
                SELECT
                    COUNT(*) AS totalAssets,
                    SUM(CASE WHEN has_ingest_feed = 1 THEN 1 ELSE 0 END) AS assetsWithFeed
                FROM asset_map";

            if (siteId.HasValue)
            {
                assetsSql += " WHERE site_id = @siteId;";
            }
            else
            {
                assetsSql += ";";
            }

            using (var cmd = new MySqlCommand(assetsSql, conn))
            {
                if (siteId.HasValue)
                {
                    cmd.Parameters.AddWithValue("@siteId", siteId.Value);
                }

                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    int totalAssetsOrd = reader.GetOrdinal("totalAssets");
                    int assetsWithFeedOrd = reader.GetOrdinal("assetsWithFeed");

                    result.TotalAssets = reader.IsDBNull(totalAssetsOrd) ? 0 : reader.GetInt32(totalAssetsOrd);
                    result.AssetsWithFeed = reader.IsDBNull(assetsWithFeedOrd) ? 0 : reader.GetInt32(assetsWithFeedOrd);

                    if (result.TotalAssets > 0)
                    {
                        result.CoveragePercent =
                            (double)result.AssetsWithFeed / result.TotalAssets * 100.0;
                    }
                    else
                    {
                        result.CoveragePercent = null;
                    }
                }
            }

            return Ok(result);
        }
    }
}
