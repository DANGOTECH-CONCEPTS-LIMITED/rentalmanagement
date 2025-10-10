using Application.Interfaces.PrepaidApi;
using Application.Interfaces.STSVending;
using Domain.Dtos.PrepaidApi;
using Domain.Dtos.StsVending;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using System;
using System.Globalization;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Infrastructure.Services.PrepaidApi
{
    public sealed class StsResponse
    {
        public int Code { get; set; }
        public string? Message { get; set; }
        public StsData? Data { get; set; }
    }

    public sealed class StsData
    {
        public string? MeterCode { get; set; }
        public string? StreetAddress { get; set; }
        public string? CityTown { get; set; }
        public string? SuburbLocation { get; set; }
    }

    public sealed class PosResponse
    {
        [JsonPropertyName("result_code")]
        public int result_code { get; set; }

        [JsonPropertyName("result")]
        public List<PosCustomer> result { get; set; } = new();

        [JsonPropertyName("reason")]
        public string? reason { get; set; }
    }

    public sealed class PosCustomer
    {
        [JsonPropertyName("customer_number")]
        public string? customer_number { get; set; }

        [JsonPropertyName("customer_name")]
        public string? customer_name { get; set; }

        [JsonPropertyName("meter_number")]
        public string? meter_number { get; set; }
    }


    public class PrepaidApiService : IPrepaidApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;
        private readonly string _username;
        private readonly string _password;
        private readonly string _companyname;
        private readonly string _password_vend;
        public ISTSProcessing _stsProcessing;

        public PrepaidApiService(HttpClient httpClient, IConfiguration config, ISTSProcessing sTSProcessing)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri(config["PosApi:BaseUrl"]);
            _username = config["PosApi:user_name"];
            _password = config["PosApi:password"];
            _companyname = config["PosApi:company_name"];
            _password_vend = config["PosApi:vendpassword"];
            _stsProcessing = sTSProcessing;
        }

        private async Task<string> PostAndReadStringAsync(string endpoint, object payload)
        {
            var response = await _httpClient.PostAsJsonAsync(endpoint, payload);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> SearchCustomerAsync(CustomerSearchDto searchDto)
        {

            if (searchDto.MeterNumber.StartsWith("015"))
            {
                var resp = await _stsProcessing.ValidateSTSMeter(searchDto.MeterNumber);
                return NormalizeStsToPosJson(resp);
            }
            else if (searchDto.MeterNumber.Length<13)
            {
                throw new ArgumentException("Invalid Meter Number");
            }
            else
            {
                var request = new
                {
                    company_name = _companyname,
                    user_name = _username,
                    password = _password,
                    customer_number = string.Empty,
                    meter_number = searchDto.MeterNumber,
                    customer_name = string.Empty
                };

                return await PostAndReadStringAsync("api/POS_Customer", request);
            }
        }

        public Task<string> PreviewAsync(PurchasePreviewDto previewDto)
        {
            if (previewDto.MeterNumber.StartsWith("015")) 
            {
                var response = new
                {
                    result_code = 0,
                    result = new
                    {
                        total_paid = 0.00m,
                        total_unit = 0.0m,
                        token = "",
                        customer_number = "4",
                        customer_name = "Mukono",   // ✅ fixed the broken string
                        customer_addr = "Mukono",
                        meter_number = previewDto.MeterNumber,
                        gen_datetime = DateTime.Now,
                        gen_user = "manual",
                        company = "daniel",
                        price = 3000.00m,
                        vat = 0.00m,
                        tid_datetime = DateTime.Now,
                        currency = "UGX",
                        unit = "m³",
                        TaskNo = ""
                    },
                    reason = "OK"
                };

                string msg = JsonSerializer.Serialize(response);
                return Task.FromResult(msg);
            }
            else
            {
                var request = new
                {
                    company_name = _companyname,
                    user_name = _username,
                    password = _password,
                    meter_number = previewDto.MeterNumber,
                    is_vend_by_unit = false,
                    amount = previewDto.Amount
                };

                return PostAndReadStringAsync("api/POS_Preview", request);
            }
        }

        public async Task<PurchaseApiResponse> PurchaseAsync(PurchasePreviewDto previewDto)
        {
            if (previewDto.MeterNumber.StartsWith("015"))
            {
                var resp = await _stsProcessing.GetVendingToken(previewDto.MeterNumber, int.Parse(previewDto.Amount.ToString()));
                StsVendResponse? sts;
                try
                {
                    sts = JsonSerializer.Deserialize<StsVendResponse>(
                        resp,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                }
                catch
                {
                    return BuildPurchaseError("Invalid STS response");
                }

                if (sts == null) return BuildPurchaseError("Empty STS response");
                return MapStsVendToPurchase(previewDto, sts);
            }
            else 
            {
                var request = new
                {
                    company_name = _companyname,
                    user_name = _username,
                    password = _password,
                    password_vend = _password_vend,
                    meter_number = previewDto.MeterNumber,
                    is_vend_by_unit = false,
                    amount = previewDto.Amount
                };

                var response = await _httpClient.PostAsJsonAsync("api/POS_Purchase", request);
                response.EnsureSuccessStatusCode();
                string json = await response.Content.ReadAsStringAsync();
                var resp = await response.Content.ReadFromJsonAsync<PurchaseApiResponse>()
                       ?? throw new InvalidOperationException("Failed to deserialize purchase result");

                return resp;
            } 
        }

        private static string NormalizeStsToPosJson(string stsJson)
        {
            try
            {
                var sts = JsonSerializer.Deserialize<StsResponse>(
                    stsJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (sts == null)
                    return BuildPosError("Empty STS response");

                // Map: Code==200 => result_code=0 (success). Otherwise non-zero.
                var pos = new PosResponse
                {
                    result_code = sts.Code == 200 ? 0 : sts.Code,
                    reason = string.IsNullOrWhiteSpace(sts.Message) ? "Unknown" : sts.Message,
                    result = new List<PosCustomer>()
                };

                if (sts.Code == 200 && sts.Data != null)
                {
                    pos.result.Add(new PosCustomer
                    {
                        // STS doesn’t give these; keep them empty to match your POS format
                        customer_number = "5",
                        customer_name = "Fred Nkutu",
                        // Map the meter number
                        meter_number = sts.Data.MeterCode ?? ""
                    });
                }

                return JsonSerializer.Serialize(
                    pos,
                    new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = null, // keep snake_case as defined by attributes
                        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
                    });
            }
            catch
            {
                return BuildPosError("Invalid STS response");
            }
        }

        private static string BuildPosError(string msg)
        {
            var err = new PosResponse
            {
                result_code = 1,
                reason = msg,
                result = new List<PosCustomer>() // empty list on error
            };
            return JsonSerializer.Serialize(err, new JsonSerializerOptions { PropertyNamingPolicy = null });
        }

        // Helper class to build responses

        // --- Helpers ---
        private static decimal ParsePriceFromTariff(string? tariff)
        {
            if (string.IsNullOrWhiteSpace(tariff)) return 0m;

            // Grab the first number (handles 3000, 3000.000, 3,000.00, etc.)
            var m = Regex.Match(tariff, @"-?\d{1,3}(?:[,\s]?\d{3})*(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?");
            var raw = m.Success ? m.Value.Replace(",", "").Trim() : "0";

            return decimal.TryParse(raw, NumberStyles.Any, CultureInfo.InvariantCulture, out var price)
                ? price
                : 0m;
        }

        private PurchaseApiResponse BuildPurchaseError(string msg, int code = 1) => new()
        {
            ResultCode = code,
            Reason = msg,
            Result = null!
        };

        private PurchaseApiResponse MapStsVendToPurchase(PurchasePreviewDto dto, StsVendResponse sts)
        {
            var ok = sts.Code == 200;
            var now = DateTime.Now.ToString("s"); // ISO-like "yyyy-MM-ddTHH:mm:ss"

            return new PurchaseApiResponse
            {
                ResultCode = ok ? 0 : sts.Code,
                Reason = string.IsNullOrWhiteSpace(sts.Message) ? (ok ? "OK" : "Unknown") : sts.Message!,
                Result = ok && sts.Data != null ? new PurchaseResultData
                {
                    TotalPaid = sts.Data.VendingAmount,
                    TotalUnit = sts.Data.VendingQuantity,
                    Token = sts.Data.Token ?? string.Empty,
                    CustomerNumber = "0",
                    CustomerName = string.Empty,
                    CustomerAddress = string.Empty,
                    MeterNumber = sts.Data.MeterCode ?? dto.MeterNumber,
                    GeneratedAt = now,
                    GeneratedBy = _username,          // or "manual" if you prefer
                    Company = _companyname,
                    Price = ParsePriceFromTariff(sts.Data.Tarrif),
                    Vat = 0m,                 // set if you need VAT here
                    TidDateTime = now,
                    Currency = "UGX",              // adjust to your flow
                    Unit = "m³",               // "kWh" or what your UI expects
                    TaskNo = string.Empty
                } : null!
            };
        }
    }
}
