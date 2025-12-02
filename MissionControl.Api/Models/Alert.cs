namespace MissionControl.Api.Models
{
    public class Alert
    {
        public int AlertId { get; set; }
        public int? SiteId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Tlp { get; set; }
        public string? ImpactBand { get; set; }
        public string? Status { get; set; }
        public bool IsApplicable { get; set; }
        public string? AffectedFunction { get; set; }
        public string? CurrentDecision { get; set; }
        public DateTime? DetectedAt { get; set; }
    }

    public class DecisionRequest
    {
        public string Action { get; set; } = string.Empty;  // "GO" | "HOLD" | "ESCALATE"
        public int UserId { get; set; }                    // triage operator
        public string? Notes { get; set; }
    }
}
