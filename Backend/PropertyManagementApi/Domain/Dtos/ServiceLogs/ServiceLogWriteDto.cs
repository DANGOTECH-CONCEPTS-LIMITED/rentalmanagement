namespace Domain.Dtos.ServiceLogs
{
    public class ServiceLogWriteDto
    {
        public string ServiceName { get; set; } = string.Empty;
        public DateTime LogDate { get; set; }
        public string LogLevel { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Exception { get; set; } = string.Empty;
        public string? SourceType { get; set; }
        public string? SourceIdentifier { get; set; }
        public string? EventHash { get; set; }
        public string? RawContent { get; set; }
    }
}