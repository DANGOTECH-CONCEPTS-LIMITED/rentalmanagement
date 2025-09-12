using Application.Interfaces.PrepaidApi;
using Application.Interfaces.STSVending;
using Domain.Dtos.PrepaidApi;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
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
        private readonly HttpClient _http;
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
                string msg = "{\"result_code\":0,\"result\":{\"total_paid\":00.00,\"total_unit\":0.0,\"token\":\"\",\"customer_number\":\"0\",\"customer_name\":\"\",\"customer_addr\":\"Mukono\",\"meter_number\":\""+previewDto.MeterNumber+"\",\"gen_datetime\":\""+DateTime.Now+"\",\"gen_user\":\"manual\",\"company\":\"daniel\",\"price\":3000.00,\"vat\":0.00,\"tid_datetime\":\""+DateTime.Now+"\",\"currency\":\"UGX\",\"unit\":\"m³\",\"TaskNo\":\"\"},\"reason\":\"OK\"}";
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
                        customer_number = "",
                        customer_name = "",
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
    }
}
