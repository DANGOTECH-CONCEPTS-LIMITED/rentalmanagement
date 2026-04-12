namespace Domain.Dtos.Collecto
{
    public class CollectoWalletWithdrawalExecutionResultDto
    {
        public string RequestUrl { get; set; } = string.Empty;
        public string RequestPayload { get; set; } = string.Empty;
        public string ResponsePayload { get; set; } = string.Empty;
        public int HttpStatusCode { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsSuccess { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
    }
}