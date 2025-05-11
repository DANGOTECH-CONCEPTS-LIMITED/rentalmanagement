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
        private readonly string _password_vend;

        public PrepaidApiService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri(config["PosApi:BaseUrl"]);
            _username = config["PosApi:user_name"];
            _password = config["PosApi:password"];
            _companyname = config["PosApi:company_name"];
            _password_vend = config["PosApi:vendpassword"];
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

        public async Task<PurchaseApiResponse> PurchaseAsync(PurchasePreviewDto previewDto)
        {
            var request = new
            {
                company_name = _companyname,
                user_name = _username,
                password = _password,
                password_vend = _password_vend,
                meter_number = previewDto.MeterNumber,
                is_vend_by_unit =false,
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
}
