using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Application.Interfaces.PrepaidApi;
using Domain.Dtos.PrepaidApi;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services.PrepaidApi
{
    public class PosApiOptions
    {
        public string BaseUrl { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
    }

    public class PrepaidApiService : IPrepaidApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly PosApiOptions _options;

        public PrepaidApiService(HttpClient httpClient, IOptions<PosApiOptions> options)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _httpClient.BaseAddress = new Uri(_options.BaseUrl);
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
                company_name = _options.CompanyName,
                user_name = _options.UserName,
                password = _options.Password,
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
                company_name = _options.CompanyName,
                user_name = _options.UserName,
                password = _options.Password,
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
