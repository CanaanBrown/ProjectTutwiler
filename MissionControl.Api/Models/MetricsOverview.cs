namespace MissionControl.Api.Models
{
    public class MetricsOverview
    {
        // Alerts
        public int TotalAlerts { get; set; }
        public int RedAlerts { get; set; }
        public int YellowAlerts { get; set; }
        public int GreenAlerts { get; set; }

        public int ActiveAlerts { get; set; }
        public int ResolvedAlerts { get; set; }
        public int SuppressedAlerts { get; set; }

        // Decisions
        public int GoDecisions { get; set; }
        public int HoldDecisions { get; set; }
        public int EscalateDecisions { get; set; }
        public DateTime? LastDecisionAt { get; set; }

        // Assets / coverage
        public int TotalAssets { get; set; }
        public int AssetsWithFeed { get; set; }
        public double? CoveragePercent { get; set; }
    }
}
