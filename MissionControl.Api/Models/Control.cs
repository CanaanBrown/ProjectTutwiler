namespace MissionControl.Api.Models
{
    public class Control
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "DETECTIVE"; // PREVENTIVE, DETECTIVE, CORRECTIVE
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE
        public int Effectiveness { get; set; }
        public string? Description { get; set; }
        public int? SiteId { get; set; }
    }
}

