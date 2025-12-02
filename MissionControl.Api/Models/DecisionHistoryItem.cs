namespace MissionControl.Api.Models
{
    public class DecisionHistoryItem
    {
        public int DecisionId { get; set; }
        public int AlertId { get; set; }
        public int UserId { get; set; }
        public string? UserName { get; set; }
        public string Action { get; set; } = "";
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
