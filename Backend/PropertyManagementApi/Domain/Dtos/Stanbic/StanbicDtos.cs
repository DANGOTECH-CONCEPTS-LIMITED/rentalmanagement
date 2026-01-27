namespace Domain.Dtos.Stanbic
{
    public class StanbicCollectRequestDto
    {
        public string Amount { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string ExternalId { get; set; } = string.Empty;
        public StanbicPayer Payer { get; set; } = new();
        public string Description { get; set; } = string.Empty;
    }

    public class StanbicPayer
    {
        public string PartyIdType { get; set; } = string.Empty;
        public string PartyId { get; set; } = string.Empty;
    }

    public class StanbicCollectStatusRequestDto
    {
        public string TransactionId { get; set; } = string.Empty;
    }

    public class StanbicTransferRequestDto
    {
        public string Amount { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string ExternalId { get; set; } = string.Empty;
        public StanbicPayee Payee { get; set; } = new();
        public string Description { get; set; } = string.Empty;
    }

    public class StanbicPayee
    {
        public string PartyIdType { get; set; } = string.Empty;
        public string PartyId { get; set; } = string.Empty;
    }

    public class StanbicTransferStatusRequestDto
    {
        public string TransactionId { get; set; } = string.Empty;
    }
}