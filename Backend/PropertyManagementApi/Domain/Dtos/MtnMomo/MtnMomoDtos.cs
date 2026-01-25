namespace Domain.Dtos.MtnMomo
{
    public class RequestToPayRequestDto
    {
        public string Amount { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string ExternalId { get; set; } = string.Empty;
        public Payer Payer { get; set; } = new();
        public string PayerMessage { get; set; } = string.Empty;
        public string PayeeNote { get; set; } = string.Empty;
    }

    public class Payer
    {
        public string PartyIdType { get; set; } = string.Empty;
        public string PartyId { get; set; } = string.Empty;
    }

    public class RequestToPayStatusRequestDto
    {
        public string TransactionId { get; set; } = string.Empty;
    }

    public class TransferRequestDto
    {
        public string Amount { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string ExternalId { get; set; } = string.Empty;
        public Payee Payee { get; set; } = new();
        public string PayerMessage { get; set; } = string.Empty;
        public string PayeeNote { get; set; } = string.Empty;
    }

    public class Payee
    {
        public string PartyIdType { get; set; } = string.Empty;
        public string PartyId { get; set; } = string.Empty;
    }

    public class TransferStatusRequestDto
    {
        public string TransactionId { get; set; } = string.Empty;
    }
}