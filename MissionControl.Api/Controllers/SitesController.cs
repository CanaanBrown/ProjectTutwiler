using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using MySqlConnector;
using MissionControl.Api.Models;

namespace MissionControl.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SitesController : ControllerBase
    {
        private readonly IConfiguration _config;

        public SitesController(IConfiguration config)
        {
            _config = config;
        }

        private MySqlConnection CreateConnection()
        {
            var connString = _config.GetConnectionString("MissionControlDb");
            return new MySqlConnection(connString);
        }

        // GET: api/sites
        [HttpGet]
        public async Task<ActionResult<List<SiteSummary>>> GetSites()
        {
            var sites = new List<SiteSummary>();

            using var conn = CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT site_id, name
                FROM sites
                ORDER BY name;";

            using var cmd = new MySqlCommand(sql, conn);
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                sites.Add(new SiteSummary
                {
                    SiteId = reader.GetInt32(reader.GetOrdinal("site_id")),
                    Name = reader.GetString(reader.GetOrdinal("name"))
                });
            }

            return Ok(sites);
        }
    }
}
