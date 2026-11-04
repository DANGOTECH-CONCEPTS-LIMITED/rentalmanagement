namespace Domain.Dtos.Ussd
{
    /// <summary>Africa's Talking end-of-session USSD notification (form-urlencoded).</summary>
    public class UssdSessionNotificationDto
    {
        public string? Date { get; set; }
        public string? SessionId { get; set; }
        public string? ServiceCode { get; set; }
        public string? NetworkCode { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Status { get; set; }
        public string? Cost { get; set; }
        public string? DurationInMillis { get; set; }
        public int HopsCount { get; set; }
        public string? HopsMetadata { get; set; }
        public string? Input { get; set; }
        public string? LastAppResponse { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
