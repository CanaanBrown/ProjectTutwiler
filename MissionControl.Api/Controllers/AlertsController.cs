using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using MySqlConnector;
using MissionControl.Api.Models;

namespace MissionControl.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AlertsController : ControllerBase
    {
        private readonly IConfiguration _config;

        public AlertsController(IConfiguration config)
        {
            _config = config;
        }

        private MySqlConnection CreateConnection()
        {
            var connString = _config.GetConnectionString("MissionControlDb");
            return new MySqlConnection(connString);
        }

        // GET: api/alerts?siteId=1
        [HttpGet]
        public async Task<ActionResult<List<Alert>>> GetAlerts([FromQuery] int? siteId = null)
        {
            var alerts = new List<Alert>();

            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT
                    alert_id,
                    site_id,
                    title,
                    description,
                    tlp,
                    impact_band,
                    status,
                    is_applicable,
                    affected_function,
                    current_decision,
                    detected_at
                FROM alerts
                WHERE 1 = 1";

            if (siteId.HasValue)
            {
                sql += " AND site_id = @siteId";
            }

            sql += @"
                ORDER BY detected_at DESC
                LIMIT 50;";

            using var cmd = new MySqlCommand(sql, conn);
            if (siteId.HasValue)
            {
                cmd.Parameters.AddWithValue("@siteId", siteId.Value);
            }

            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                alerts.Add(ReadAlert(reader));
            }

            return Ok(alerts);
        }

        // GET: api/alerts/active?siteId=1
        [HttpGet("active")]
        public async Task<ActionResult<Alert>> GetActiveAlert([FromQuery] int? siteId = null)
        {
            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT
                    alert_id,
                    site_id,
                    title,
                    description,
                    tlp,
                    impact_band,
                    status,
                    is_applicable,
                    affected_function,
                    current_decision,
                    detected_at
                FROM alerts
                WHERE status = 'ACTIVE'";

            if (siteId.HasValue)
            {
                sql += " AND site_id = @siteId";
            }

            sql += @"
                ORDER BY
                    CASE impact_band
                        WHEN 'RED' THEN 3
                        WHEN 'YELLOW' THEN 2
                        WHEN 'GREEN' THEN 1
                        ELSE 0
                    END DESC,
                    detected_at DESC
                LIMIT 1;";

            using var cmd = new MySqlCommand(sql, conn);
            if (siteId.HasValue)
            {
                cmd.Parameters.AddWithValue("@siteId", siteId.Value);
            }

            using var reader = await cmd.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return NotFound();
            }

            var alert = ReadAlert(reader);
            return Ok(alert);
        }

        // GET: api/alerts/{alertId}/decisions  (history timeline)
        [HttpGet("{alertId:int}/decisions")]
        public async Task<ActionResult<List<DecisionHistoryItem>>> GetDecisionsForAlert(int alertId)
        {
            var items = new List<DecisionHistoryItem>();

            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT
                    d.decision_id,
                    d.alert_id,
                    d.user_id,
                    u.name AS user_name,
                    d.action,
                    d.notes,
                    d.created_at
                FROM decisions d
                LEFT JOIN users u ON d.user_id = u.user_id
                WHERE d.alert_id = @alertId
                ORDER BY d.created_at DESC;";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@alertId", alertId);

            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                items.Add(new DecisionHistoryItem
                {
                    DecisionId = reader.GetInt32(reader.GetOrdinal("decision_id")),
                    AlertId = reader.GetInt32(reader.GetOrdinal("alert_id")),
                    UserId = reader.GetInt32(reader.GetOrdinal("user_id")),
                    UserName = reader.IsDBNull(reader.GetOrdinal("user_name"))
                        ? null
                        : reader.GetString(reader.GetOrdinal("user_name")),
                    Action = reader.GetString(reader.GetOrdinal("action")),
                    Notes = reader.IsDBNull(reader.GetOrdinal("notes"))
                        ? null
                        : reader.GetString(reader.GetOrdinal("notes")),
                    CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
                });
            }

            return Ok(items);
        }

        // POST: api/alerts/{alertId}/decision
        [HttpPost("{alertId:int}/decision")]
        public async Task<ActionResult> PostDecision(int alertId, [FromBody] DecisionRequest request)
        {
            var allowed = new[] { "GO", "HOLD", "ESCALATE" };
            if (!allowed.Contains(request.Action))
            {
                return BadRequest("Action must be GO, HOLD, or ESCALATE.");
            }

            // Map decision -> new status (queue behavior)
            string newStatus = request.Action switch
            {
                "GO" => "RESOLVED",
                "ESCALATE" => "RESOLVED",
                "HOLD" => "ACTIVE",
                _ => "ACTIVE"
            };

            using var conn = CreateConnection();
            await conn.OpenAsync();

            using var tx = await conn.BeginTransactionAsync();

            // 1) Ensure alert exists
            var checkCmd = new MySqlCommand(
                "SELECT COUNT(*) FROM alerts WHERE alert_id = @alertId;",
                conn, tx);
            checkCmd.Parameters.AddWithValue("@alertId", alertId);

            var count = Convert.ToInt32(await checkCmd.ExecuteScalarAsync());
            if (count == 0)
            {
                await tx.RollbackAsync();
                return NotFound("Alert not found.");
            }

            // 2) Insert decision
            var insertCmd = new MySqlCommand(@"
                INSERT INTO decisions (alert_id, user_id, action, notes, created_at)
                VALUES (@alertId, @userId, @action, @notes, NOW());",
                conn, tx);

            insertCmd.Parameters.AddWithValue("@alertId", alertId);
            insertCmd.Parameters.AddWithValue("@userId", request.UserId);
            insertCmd.Parameters.AddWithValue("@action", request.Action);
            insertCmd.Parameters.AddWithValue("@notes", (object?)request.Notes ?? DBNull.Value);

            await insertCmd.ExecuteNonQueryAsync();

            // 3) Update alert with latest decision + status
            var updateCmd = new MySqlCommand(@"
                UPDATE alerts
                SET current_decision = @action,
                    status = @status
                WHERE alert_id = @alertId;",
                conn, tx);

            updateCmd.Parameters.AddWithValue("@alertId", alertId);
            updateCmd.Parameters.AddWithValue("@action", request.Action);
            updateCmd.Parameters.AddWithValue("@status", newStatus);

            await updateCmd.ExecuteNonQueryAsync();

            await tx.CommitAsync();

            return Ok(new
            {
                message = "Decision recorded.",
                alertId,
                request.Action,
                request.UserId,
                newStatus
            });
        }

        // Helper to map a data reader row to Alert model
        private static Alert ReadAlert(MySqlDataReader reader)
        {
            return new Alert
            {
                AlertId = reader.GetInt32(reader.GetOrdinal("alert_id")),
                SiteId = reader.IsDBNull(reader.GetOrdinal("site_id"))
                    ? null
                    : reader.GetInt32(reader.GetOrdinal("site_id")),
                Title = reader.GetString(reader.GetOrdinal("title")),
                Description = reader.IsDBNull(reader.GetOrdinal("description"))
                    ? null
                    : reader.GetString(reader.GetOrdinal("description")),
                Tlp = reader.IsDBNull(reader.GetOrdinal("tlp"))
                    ? null
                    : reader.GetString(reader.GetOrdinal("tlp")),
                ImpactBand = reader.IsDBNull(reader.GetOrdinal("impact_band"))
                    ? null
                    : reader.GetString(reader.GetOrdinal("impact_band")),
                Status = reader.IsDBNull(reader.GetOrdinal("status"))
                    ? null
                    : reader.GetString(reader.GetOrdinal("status")),
                IsApplicable = !reader.IsDBNull(reader.GetOrdinal("is_applicable"))
                    && reader.GetInt32(reader.GetOrdinal("is_applicable")) == 1,
                AffectedFunction = reader.IsDBNull(reader.GetOrdinal("affected_function"))
                    ? null
                    : reader.GetString(reader.GetOrdinal("affected_function")),
                CurrentDecision = reader.IsDBNull(reader.GetOrdinal("current_decision"))
                    ? null
                    : reader.GetString(reader.GetOrdinal("current_decision")),
                DetectedAt = reader.IsDBNull(reader.GetOrdinal("detected_at"))
                    ? null
                    : reader.GetDateTime(reader.GetOrdinal("detected_at"))
            };
        }
    }
}
