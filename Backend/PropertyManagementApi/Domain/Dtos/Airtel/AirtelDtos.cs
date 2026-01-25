namespace Domain.Dtos.Airtel
{
    public class CollectRequestDto
    {
        public string Reference { get; set; } = string.Empty;
        public Subscriber Subscriber { get; set; } = new();
        public Transaction Transaction { get; set; } = new();
    }

    public class Subscriber
    {
        public string Country { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string Msisdn { get; set; } = string.Empty;
    }

    public class Transaction
    {
        public string Amount { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string Id { get; set; } = string.Empty;
    }

    public class CollectStatusRequestDto
    {
        public string TransactionId { get; set; } = string.Empty;
    }

    public class DisburseRequestDto
    {
        public string Reference { get; set; } = string.Empty;
        public Payee Payee { get; set; } = new();
        public Transaction Transaction { get; set; } = new();
    }

    public class Payee
    {
        public string Country { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string Msisdn { get; set; } = string.Empty;
    }

    public class DisburseStatusRequestDto
    {
        public string TransactionId { get; set; } = string.Empty;
    }
}