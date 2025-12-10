using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using MySqlConnector;
using MissionControl.Api.Models;

namespace MissionControl.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PatchesController : ControllerBase
    {
        private readonly IConfiguration _config;

        public PatchesController(IConfiguration config)
        {
            _config = config;
        }

        private MySqlConnection CreateConnection()
        {
            var connString = _config.GetConnectionString("MissionControlDb");
            return new MySqlConnection(connString);
        }

        // GET: api/patches?siteId=1
        [HttpGet]
        public async Task<ActionResult<List<Patch>>> GetPatches([FromQuery] int? siteId = null)
        {
            var patches = new List<Patch>();

            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT
                    patch_id,
                    name,
                    cve,
                    status,
                    date,
                    affected_systems,
                    notes,
                    site_id
                FROM patches
                WHERE 1 = 1";

            if (siteId.HasValue)
            {
                sql += " AND site_id = @siteId";
            }

            sql += " ORDER BY date DESC;";

            using var cmd = new MySqlCommand(sql, conn);
            if (siteId.HasValue)
            {
                cmd.Parameters.AddWithValue("@siteId", siteId.Value);
            }

            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                patches.Add(ReadPatch(reader));
            }

            return Ok(patches);
        }

        // GET: api/patches/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Patch>> GetPatch(int id)
        {
            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT
                    patch_id,
                    name,
                    cve,
                    status,
                    date,
                    affected_systems,
                    notes,
                    site_id
                FROM patches
                WHERE patch_id = @id;";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@id", id);

            using var reader = await cmd.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return NotFound();
            }

            return Ok(ReadPatch(reader));
        }

        // POST: api/patches
        [HttpPost]
        public async Task<ActionResult<Patch>> CreatePatch([FromBody] Patch patch)
        {
            if (string.IsNullOrWhiteSpace(patch.Name))
            {
                return BadRequest("Patch name is required.");
            }

            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                INSERT INTO patches (name, cve, status, date, affected_systems, notes, site_id)
                VALUES (@name, @cve, @status, @date, @affectedSystems, @notes, @siteId);
                SELECT LAST_INSERT_ID();";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@name", patch.Name);
            cmd.Parameters.AddWithValue("@cve", (object?)patch.Cve ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@status", patch.Status ?? "PENDING");
            cmd.Parameters.AddWithValue("@date", patch.Date);
            cmd.Parameters.AddWithValue("@affectedSystems", (object?)patch.AffectedSystems ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@notes", (object?)patch.Notes ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@siteId", (object?)patch.SiteId ?? DBNull.Value);

            var newId = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            patch.Id = newId;

            return CreatedAtAction(nameof(GetPatch), new { id = newId }, patch);
        }

        // PUT: api/patches/{id}
        [HttpPut("{id:int}")]
        public async Task<ActionResult> UpdatePatch(int id, [FromBody] Patch patch)
        {
            if (string.IsNullOrWhiteSpace(patch.Name))
            {
                return BadRequest("Patch name is required.");
            }

            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                UPDATE patches
                SET name = @name,
                    cve = @cve,
                    status = @status,
                    date = @date,
                    affected_systems = @affectedSystems,
                    notes = @notes,
                    site_id = @siteId
                WHERE patch_id = @id;";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@name", patch.Name);
            cmd.Parameters.AddWithValue("@cve", (object?)patch.Cve ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@status", patch.Status ?? "PENDING");
            cmd.Parameters.AddWithValue("@date", patch.Date);
            cmd.Parameters.AddWithValue("@affectedSystems", (object?)patch.AffectedSystems ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@notes", (object?)patch.Notes ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@siteId", (object?)patch.SiteId ?? DBNull.Value);

            var rowsAffected = await cmd.ExecuteNonQueryAsync();

            if (rowsAffected == 0)
            {
                return NotFound();
            }

            return NoContent();
        }

        // DELETE: api/patches/{id}
        [HttpDelete("{id:int}")]
        public async Task<ActionResult> DeletePatch(int id)
        {
            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = "DELETE FROM patches WHERE patch_id = @id;";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@id", id);

            var rowsAffected = await cmd.ExecuteNonQueryAsync();

            if (rowsAffected == 0)
            {
                return NotFound();
            }

            return NoContent();
        }

        // POST: api/patches/{id}/apply
        [HttpPost("{id:int}/apply")]
        public async Task<ActionResult> ApplyPatch(int id)
        {
            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                UPDATE patches
                SET status = 'APPLIED',
                    date = NOW()
                WHERE patch_id = @id;";

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@id", id);

            var rowsAffected = await cmd.ExecuteNonQueryAsync();

            if (rowsAffected == 0)
            {
                return NotFound();
            }

            return Ok(new { message = "Patch applied successfully.", patchId = id });
        }

        private static Patch ReadPatch(MySqlDataReader reader)
        {
            return new Patch
            {
                Id = reader.GetInt32(reader.GetOrdinal("patch_id")),
                Name = reader.GetString(reader.GetOrdinal("name")),
                Cve = reader.IsDBNull(reader.GetOrdinal("cve"))
                    ? null
                    : reader.GetString(reader.GetOrdinal("cve")),
                Status = reader.IsDBNull(reader.GetOrdinal("status"))
                    ? "PENDING"
                    : reader.GetString(reader.GetOrdinal("status")),
                Date = reader.IsDBNull(reader.GetOrdinal("date"))
                    ? DateTime.Now
                    : reader.GetDateTime(reader.GetOrdinal("date")),
                AffectedSystems = reader.IsDBNull(reader.GetOrdinal("affected_systems"))
                    ? null
                    : reader.GetString(reader.GetOrdinal("affected_systems")),
                Notes = reader.IsDBNull(reader.GetOrdinal("notes"))
                    ? null
                    : reader.GetString(reader.GetOrdinal("notes")),
                SiteId = reader.IsDBNull(reader.GetOrdinal("site_id"))
                    ? null
                    : reader.GetInt32(reader.GetOrdinal("site_id"))
            };
        }
    }
}

