namespace MissionControl.Api.Models
{
    public class Patch
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Cve { get; set; }
        public string Status { get; set; } = "PENDING"; // PENDING, APPLIED, FAILED
        public DateTime Date { get; set; }
        public string? AffectedSystems { get; set; }
        public string? Notes { get; set; }
        public int? SiteId { get; set; }
    }
}

