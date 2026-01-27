namespace Domain.Dtos.Airtel
{
    public class AirtelCollectRequestDto
    {
        public string Reference { get; set; } = string.Empty;
        public AirtelSubscriber Subscriber { get; set; } = new();
        public AirtelTransaction Transaction { get; set; } = new();
    }

    public class AirtelSubscriber
    {
        public string Country { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string Msisdn { get; set; } = string.Empty;
    }

    public class AirtelTransaction
    {
        public string Amount { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string Id { get; set; } = string.Empty;
    }

    public class AirtelCollectStatusRequestDto
    {
        public string TransactionId { get; set; } = string.Empty;
    }

    public class AirtelDisburseRequestDto
    {
        public string Reference { get; set; } = string.Empty;
        public AirtelPayee Payee { get; set; } = new();
        public AirtelTransaction Transaction { get; set; } = new();
    }

    public class AirtelPayee
    {
        public string Country { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string Msisdn { get; set; } = string.Empty;
    }

    public class AirtelDisburseStatusRequestDto
    {
        public string TransactionId { get; set; } = string.Empty;
    }
}