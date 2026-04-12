namespace Domain.Dtos.ServiceLogs
{
    public class SerilogImportResultDto
    {
        public int FilesProcessed { get; set; }
        public int EventsDiscovered { get; set; }
        public int EventsImported { get; set; }
        public int EventsSkipped { get; set; }
        public List<string> ImportedFiles { get; set; } = new();
        public List<string> MissingFiles { get; set; } = new();
    }
}