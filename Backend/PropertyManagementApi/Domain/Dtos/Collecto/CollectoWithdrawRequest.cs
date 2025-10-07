using System.Text.Json.Serialization;

namespace Dtos.Collecto
{
    public class CollectoWithdrawRequest
    {
        [JsonPropertyName("reference")]
        public string Reference { get; set; } = string.Empty;

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("amount")]
        public decimal Amount { get; set; }

        [JsonPropertyName("receivingWallet")]
        public long ReceivingWallet { get; set; }
    }
}
