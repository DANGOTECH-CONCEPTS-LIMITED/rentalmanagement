using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Interfaces.Collecto;
using Domain.Dtos.Airtel;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services.Collecto
{
    public class AirtelService : IAirtelApiClient
    {
        private readonly HttpClient _http;
        private readonly string _clientId;
        private readonly string _clientSecret;
        private readonly string _baseUrl;
        private readonly string _environment;
        private string _accessToken;
        private DateTime _tokenExpiry;

        public AirtelService(HttpClient http, IConfiguration config)
        {
            _http = http;
            _clientId = config["Airtel:ClientId"];
            _clientSecret = config["Airtel:ClientSecret"];
            _baseUrl = config["Airtel:BaseUrl"];
            _environment = config["Airtel:Environment"];
            _http.BaseAddress = new Uri(_baseUrl);
        }

        private async Task EnsureAccessTokenAsync()
        {
            if (!string.IsNullOrEmpty(_accessToken) && DateTime.UtcNow < _tokenExpiry)
                return;

            var credentials = new Dictionary<string, string>
            {
                { "client_id", _clientId },
                { "client_secret", _clientSecret },
                { "grant_type", "client_credentials" }
            };

            _http.DefaultRequestHeaders.Clear();
            var response = await _http.PostAsync("auth/oauth2/token", new FormUrlEncodedContent(credentials));
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();
            var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(json);
            _accessToken = tokenResponse.AccessToken;
            _tokenExpiry = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
        }

        private void SetHeaders()
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
        }

        public async Task<string> GetAccessTokenAsync()
        {
            await EnsureAccessTokenAsync();
            return _accessToken;
        }

        public async Task<string> CollectAsync(CollectRequestDto request)
        {
            await EnsureAccessTokenAsync();
            SetHeaders();
            var response = await _http.PostAsJsonAsync($"standard/v2/payments/", request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> GetCollectStatusAsync(CollectStatusRequestDto request)
        {
            await EnsureAccessTokenAsync();
            SetHeaders();
            var response = await _http.GetAsync($"standard/v2/payments/{request.TransactionId}");
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> DisburseAsync(DisburseRequestDto request)
        {
            await EnsureAccessTokenAsync();
            SetHeaders();
            var response = await _http.PostAsJsonAsync($"standard/v2/disbursements/", request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> GetDisburseStatusAsync(DisburseStatusRequestDto request)
        {
            await EnsureAccessTokenAsync();
            SetHeaders();
            var response = await _http.GetAsync($"standard/v2/disbursements/{request.TransactionId}");
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        private class TokenResponse
        {
            public string AccessToken { get; set; } = string.Empty;
            public int ExpiresIn { get; set; }
        }
    }
}