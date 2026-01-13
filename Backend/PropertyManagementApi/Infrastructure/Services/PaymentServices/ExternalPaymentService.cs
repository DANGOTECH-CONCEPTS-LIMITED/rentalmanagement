using Application.Interfaces.Collecto;
using Application.Interfaces.PaymentService;
using Domain.Dtos.Collecto;
using Domain.Dtos.Payments;
using Microsoft.Extensions.Configuration;
using System;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace Infrastructure.Services.PaymentServices
{
    public class ExternalPaymentService : IExternalPaymentService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ICollectoApiClient _collectoApiClient;

        public ExternalPaymentService(HttpClient httpClient, IConfiguration configuration, ICollectoApiClient collectoApiClient)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _collectoApiClient = collectoApiClient;
        }

        public async Task<PayInResponseDto> InitiatePayInAsync(PayInRequestDto request)
        {
            if (request.Gateway.ToLower() == "collecto")
            {
                // Use Collecto for pay-in
                var collectoRequest = new RequestToPayRequestDto
                {
                    PaymentOption = "mobilemoney",
                    Phone = request.Metadata.GetValueOrDefault("phone", ""),
                    Amount = (decimal)request.Amount,
                    Reference = request.Reference
                };

                var rawResponse = await _collectoApiClient.RequestToPayAsync(collectoRequest);
                var responseData = JsonSerializer.Deserialize<CollectoResponse>(rawResponse);

                return new PayInResponseDto
                {
                    TransactionId = request.Reference,
                    Status = responseData?.data?.requestToPay == true ? "pending" : "failed",
                    GatewayReference = responseData?.data?.transactionId ?? "",
                    CreatedAt = DateTime.UtcNow
                };
            }
            else
            {
                // Fallback to other gateways (e.g., Stripe)
                var gatewayUrl = _configuration["ExternalPayments:Stripe:BaseUrl"];
                var apiKey = _configuration["ExternalPayments:Stripe:ApiKey"];

                // Simulate API call
                return new PayInResponseDto
                {
                    TransactionId = Guid.NewGuid().ToString(),
                    Status = "pending",
                    GatewayReference = "stripe_ref_" + Guid.NewGuid().ToString(),
                    CreatedAt = DateTime.UtcNow
                };
            }
        }

        public async Task<PayInResponseDto> GetPayInStatusAsync(string transactionId)
        {
            // For Collecto, use GetRequestToPayStatusAsync
            var statusRequest = new RequestToPayStatusRequestDto { TransactionId = transactionId };
            var rawResponse = await _collectoApiClient.GetRequestToPayStatusAsync(statusRequest);
            var responseData = JsonSerializer.Deserialize<CollectoStatusResponse>(rawResponse);

            return new PayInResponseDto
            {
                TransactionId = transactionId,
                Status = responseData?.data?.status ?? "unknown",
                GatewayReference = responseData?.data?.transactionId ?? "",
                CreatedAt = DateTime.UtcNow
            };
        }

        public async Task<PayoutResponseDto> InitiatePayoutAsync(PayoutRequestDto request)
        {
            if (request.Gateway.ToLower() == "collecto")
            {
                // Use Collecto for payout (assuming mobile money payout)
                var payoutRequest = new InitiatePayoutRequestDto
                {
                    Gateway = "mobilemoney",
                    AccountName = request.RecipientName,
                    AccountNumber = request.RecipientAccount,
                    Amount = request.Amount,
                    Message = request.Description,
                    Phone = request.RecipientAccount,
                    Reference = request.Reference
                };

                var rawResponse = await _collectoApiClient.InitiatePayoutAsync(payoutRequest);
                var responseData = JsonSerializer.Deserialize<CollectoPayoutResponse>(rawResponse);

                return new PayoutResponseDto
                {
                    TransactionId = request.Reference,
                    Status = responseData?.data?.payout == true ? "pending" : "failed",
                    GatewayReference = responseData?.data?.otherReference ?? "",
                    CreatedAt = DateTime.UtcNow
                };
            }
            else
            {
                // Fallback to bank payout
                return new PayoutResponseDto
                {
                    TransactionId = Guid.NewGuid().ToString(),
                    Status = "pending",
                    GatewayReference = "bank_ref_" + Guid.NewGuid().ToString(),
                    CreatedAt = DateTime.UtcNow
                };
            }
        }

        public async Task<PayoutResponseDto> GetPayoutStatusAsync(string transactionId)
        {
            // For Collecto, use GetPayoutStatusAsync
            var statusRequest = new PayoutStatusRequestDto { Reference = transactionId };
            var rawResponse = await _collectoApiClient.GetPayoutStatusAsync(statusRequest);
            var responseData = JsonSerializer.Deserialize<CollectoPayoutStatusResponse>(rawResponse);

            return new PayoutResponseDto
            {
                TransactionId = transactionId,
                Status = responseData?.data?.data?.FirstOrDefault()?.status ?? "unknown",
                GatewayReference = responseData?.data?.data?.FirstOrDefault()?.transaction_id ?? "",
                CreatedAt = DateTime.UtcNow
            };
        }

        // Helper classes for Collecto responses (simplified)
        private class CollectoResponse
        {
            public DataModel data { get; set; }
            public class DataModel
            {
                public bool requestToPay { get; set; }
                public string transactionId { get; set; }
            }
        }

        private class CollectoStatusResponse
        {
            public StatusData data { get; set; }
            public class StatusData
            {
                public string status { get; set; }
                public string transactionId { get; set; }
            }
        }

        private class CollectoPayoutResponse
        {
            public PayoutData data { get; set; }
            public class PayoutData
            {
                public bool payout { get; set; }
                public string otherReference { get; set; }
            }
        }

        private class CollectoPayoutStatusResponse
        {
            public PayoutStatusData data { get; set; }
            public class PayoutStatusData
            {
                public List<PayoutItem> data { get; set; }
            }
            public class PayoutItem
            {
                public string status { get; set; }
                public string transaction_id { get; set; }
            }
        }
    }
}