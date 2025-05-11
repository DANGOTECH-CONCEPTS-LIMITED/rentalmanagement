using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json.Serialization;

namespace Domain.Dtos.PrepaidApi
{
    // 1a) Top‐level response
    public class PurchaseApiResponse
    {
        [JsonPropertyName("result_code")]
        public int ResultCode { get; set; }

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = default!;

        [JsonPropertyName("result")]
        public PurchaseResultData Result { get; set; } = default!;
    }

    // 1b) Inner “result” object
    public class PurchaseResultData
    {
        [JsonPropertyName("total_paid")]
        public decimal TotalPaid { get; set; }

        [JsonPropertyName("total_unit")]
        public decimal TotalUnit { get; set; }

        [JsonPropertyName("token")]
        public string Token { get; set; } = default!;

        [JsonPropertyName("customer_number")]
        public string CustomerNumber { get; set; } = default!;

        [JsonPropertyName("customer_name")]
        public string CustomerName { get; set; } = default!;

        [JsonPropertyName("customer_addr")]
        public string CustomerAddress { get; set; } = default!;

        [JsonPropertyName("meter_number")]
        public string MeterNumber { get; set; } = default!;

        [JsonPropertyName("gen_datetime")]
        public string GeneratedAt { get; set; } = default!;

        [JsonPropertyName("gen_user")]
        public string GeneratedBy { get; set; } = default!;

        [JsonPropertyName("company")]
        public string Company { get; set; } = default!;

        [JsonPropertyName("price")]
        public decimal Price { get; set; }

        [JsonPropertyName("vat")]
        public decimal Vat { get; set; }

        [JsonPropertyName("tid_datetime")]
        public string TidDateTime { get; set; } = default!;

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = default!;

        [JsonPropertyName("unit")]
        public string Unit { get; set; } = default!;

        [JsonPropertyName("TaskNo")]
        public string TaskNo { get; set; } = default!;
    }

}
