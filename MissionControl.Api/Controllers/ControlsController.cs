using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using MySqlConnector;
using MissionControl.Api.Models;

namespace MissionControl.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ControlsController : ControllerBase
    {
        private readonly IConfiguration _config;

        public ControlsController(IConfiguration config)
        {
            _config = config;
        }

        private MySqlConnection CreateConnection()
        {
            var connString = _config.GetConnectionString("MissionControlDb");
            return new MySqlConnection(connString);
        }

        // GET: api/controls?siteId=1
        [HttpGet]
        public async Task<ActionResult<List<Control>>> GetControls([FromQuery] int? siteId = null)
        {
            var controls = new List<Control>();

            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT
                    control_id,
                    name,
                    type,
                    status,
                    effectiveness,
                    description,
                    site_id
                FROM controls
                WHERE 1 = 1";

            if (siteId.HasValue)
            {
                sql += " AND site_id = @siteId";
            }

            sql += " ORDER BY name ASC;";

            using var cmd = new MySqlCommand(sql, conn);
            if (siteId.HasValue)
            {
                cmd.Parameters.AddWithValue("@siteId", siteId.Value);
            }

            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                controls.Add(ReadControl(reader));
            }

            return Ok(controls);
        }

        // GET: api/controls/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Control>> GetControl(int id)
        {
            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT
                    control_id,
                    name,
                    type,
                    status,
                    effectiveness,
                    description,
                    site_id
                FROM controls
                WHERE control_id = @id;";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@id", id);

            using var reader = await cmd.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return NotFound();
            }

            return Ok(ReadControl(reader));
        }

        // POST: api/controls
        [HttpPost]
        public async Task<ActionResult<Control>> CreateControl([FromBody] Control control)
        {
            if (string.IsNullOrWhiteSpace(control.Name))
            {
                return BadRequest("Control name is required.");
            }

            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                INSERT INTO controls (name, type, status, effectiveness, description, site_id)
                VALUES (@name, @type, @status, @effectiveness, @description, @siteId);
                SELECT LAST_INSERT_ID();";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@name", control.Name);
            cmd.Parameters.AddWithValue("@type", control.Type ?? "DETECTIVE");
            cmd.Parameters.AddWithValue("@status", control.Status ?? "ACTIVE");
            cmd.Parameters.AddWithValue("@effectiveness", control.Effectiveness);
            cmd.Parameters.AddWithValue("@description", (object?)control.Description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@siteId", (object?)control.SiteId ?? DBNull.Value);

            var newId = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            control.Id = newId;

            return CreatedAtAction(nameof(GetControl), new { id = newId }, control);
        }

        // PUT: api/controls/{id}
        [HttpPut("{id:int}")]
        public async Task<ActionResult> UpdateControl(int id, [FromBody] Control control)
        {
            if (string.IsNullOrWhiteSpace(control.Name))
            {
                return BadRequest("Control name is required.");
            }

            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                UPDATE controls
                SET name = @name,
                    type = @type,
                    status = @status,
                    effectiveness = @effectiveness,
                    description = @description,
                    site_id = @siteId
                WHERE control_id = @id;";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@name", control.Name);
            cmd.Parameters.AddWithValue("@type", control.Type ?? "DETECTIVE");
            cmd.Parameters.AddWithValue("@status", control.Status ?? "ACTIVE");
            cmd.Parameters.AddWithValue("@effectiveness", control.Effectiveness);
            cmd.Parameters.AddWithValue("@description", (object?)control.Description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@siteId", (object?)control.SiteId ?? DBNull.Value);

            var rowsAffected = await cmd.ExecuteNonQueryAsync();

            if (rowsAffected == 0)
            {
                return NotFound();
            }

            return NoContent();
        }

        // DELETE: api/controls/{id}
        [HttpDelete("{id:int}")]
        public async Task<ActionResult> DeleteControl(int id)
        {
            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = "DELETE FROM controls WHERE control_id = @id;";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@id", id);

            var rowsAffected = await cmd.ExecuteNonQueryAsync();

            if (rowsAffected == 0)
            {
                return NotFound();
            }

            return NoContent();
        }

        private static Control ReadControl(MySqlDataReader reader)
        {
            return new Control
            {
                Id = reader.GetInt32(reader.GetOrdinal("control_id")),
                Name = reader.GetString(reader.GetOrdinal("name")),
                Type = reader.IsDBNull(reader.GetOrdinal("type"))
                    ? "DETECTIVE"
                    : reader.GetString(reader.GetOrdinal("type")),
                Status = reader.IsDBNull(reader.GetOrdinal("status"))
                    ? "ACTIVE"
                    : reader.GetString(reader.GetOrdinal("status")),
                Effectiveness = reader.IsDBNull(reader.GetOrdinal("effectiveness"))
                    ? 0
                    : reader.GetInt32(reader.GetOrdinal("effectiveness")),
                Description = reader.IsDBNull(reader.GetOrdinal("description"))
                    ? null
                    : reader.GetString(reader.GetOrdinal("description")),
                SiteId = reader.IsDBNull(reader.GetOrdinal("site_id"))
                    ? null
                    : reader.GetInt32(reader.GetOrdinal("site_id"))
            };
        }
    }
}

