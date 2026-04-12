namespace Domain.Entities.PropertyMgt
{
    public class CollectoWalletWithdrawalHistory
    {
        public int Id { get; set; }
        public string Reference { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string WithdrawTo { get; set; } = string.Empty;
        public string RequestedByEmail { get; set; } = string.Empty;
        public string RequestedByRole { get; set; } = string.Empty;
        public string EndpointRequestUrl { get; set; } = string.Empty;
        public string EndpointRequestPayload { get; set; } = string.Empty;
        public string EndpointResponsePayload { get; set; } = string.Empty;
        public string EndpointStatus { get; set; } = string.Empty;
        public string CollectoRequestUrl { get; set; } = string.Empty;
        public string CollectoRequestPayload { get; set; } = string.Empty;
        public string CollectoResponsePayload { get; set; } = string.Empty;
        public int CollectoHttpStatusCode { get; set; }
        public string CollectoStatus { get; set; } = string.Empty;
        public bool IsSuccess { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}