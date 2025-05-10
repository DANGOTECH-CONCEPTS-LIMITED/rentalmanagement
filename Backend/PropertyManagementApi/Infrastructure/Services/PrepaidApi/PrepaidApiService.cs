using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Application.Interfaces.PrepaidApi;
using Domain.Dtos.PrepaidApi;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services.PrepaidApi
{

    public class PrepaidApiService : IPrepaidApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly HttpClient _http;
        private readonly string _baseUrl;
        private readonly string _username;
        private readonly string _password;
        private readonly string _companyname;

        public PrepaidApiService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri(config["PosApi:BaseUrl"]);
            _username = config["PosApi:user_name"];
            _password = config["PosApi:password"];
            _companyname = config["PosApi:company_name"];
        }

        private async Task<string> PostAndReadStringAsync(string endpoint, object payload)
        {
            var response = await _httpClient.PostAsJsonAsync(endpoint, payload);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public Task<string> SearchCustomerAsync(CustomerSearchDto searchDto)
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

            return PostAndReadStringAsync("api/POS_Customer", request);
        }

        public Task<string> PreviewAsync(PurchasePreviewDto previewDto)
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

        public async Task<PurchaseResultDto> PurchaseAsync(PurchasePreviewDto previewDto)
        {
            var request = new
            {
                meternumber = previewDto.MeterNumber,
                Amount = previewDto.Amount
            };

            var response = await _httpClient.PostAsJsonAsync("api/POS_Purchase", request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<PurchaseResultDto>()
                   ?? throw new InvalidOperationException("Failed to deserialize purchase result");
        }
    }
}

// DI setup (e.g., Startup.cs or Program.cs):
// services.Configure<PosApiOptions>(configuration.GetSection("PosApi"));
// services.AddHttpClient<IPrepaidApiClient, PrepaidApiService>();
