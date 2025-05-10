using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Reflection.PortableExecutable;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Interfaces.PrepaidApi;
using Domain.Dtos.PrepaidApi;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services.PrepaidApi
{
    public class PrepaidApiService : IPrepaidApiClient
    {
        private readonly HttpClient _http;
        private readonly string _baseUrl;
        public PrepaidApiService(HttpClient http, IConfiguration config)
        {
            _http = http;
            _baseUrl = config["PosApi:BaseUrl"];
        }

        private void SetHeaders()
        {
            _http.DefaultRequestHeaders.Clear();
            _http.BaseAddress = new Uri(_baseUrl);
        }
        public async Task<string> SearchCustomerAsync(CustomerSearchDto searchDto)
        {
            SetHeaders();
            // according to POS API spec (step 1) :contentReference[oaicite:3]{index=3}
            var response = await _http.PostAsJsonAsync("api/POS_Customer", new { company_name = "daniel", user_name = "POS1", password = "123456", customer_number = "", meter_number = searchDto.MeterNumber, customer_name = "" });
            response.EnsureSuccessStatusCode();
            string json = await response.Content.ReadAsStringAsync();   
            //var result = await response.Content.ReadFromJsonAsync<CustomerSearchResultDto>();
            return json!;
        }

        public async Task<string> PreviewAsync(string meternumber, decimal amount)
        {
            SetHeaders();

            // POS API spec (step 2) :contentReference[oaicite:5]{index=5}
            var response = await _http.PostAsJsonAsync("api/POS_Preview", new { Token = meternumber, Amount = amount });
            response.EnsureSuccessStatusCode();
            string json = await response.Content.ReadAsStringAsync();
            return json;
        }

        public async Task<PurchaseResultDto> PurchaseAsync(string token, decimal amount)
        {
            SetHeaders();
            // POS API spec (step 3) :contentReference[oaicite:7]{index=7}
            var response = await _http.PostAsJsonAsync("api/POS_Purchase", new { Token = token, Amount = amount });
            response.EnsureSuccessStatusCode();
            string json = await response.Content.ReadAsStringAsync();
            return await response.Content.ReadFromJsonAsync<PurchaseResultDto>()!;
        }

    }
}
