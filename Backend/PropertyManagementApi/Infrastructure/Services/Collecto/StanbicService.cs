using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Interfaces.Collecto;
using Domain.Dtos.Stanbic;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services.Collecto
{
    public class StanbicService : IStanbicApiClient
    {
        private readonly HttpClient _http;
        private readonly string _apiKey;
        private readonly string _apiSecret;
        private readonly string _baseUrl;
        private readonly string _environment;
        private string _accessToken;
        private DateTime _tokenExpiry;

        public StanbicService(HttpClient http, IConfiguration config)
        {
            _http = http;
            _apiKey = config["Stanbic:ApiKey"];
            _apiSecret = config["Stanbic:ApiSecret"];
            _baseUrl = config["Stanbic:BaseUrl"];
            _environment = config["Stanbic:Environment"];
            _http.BaseAddress = new Uri(_baseUrl);
        }

        private async Task EnsureAccessTokenAsync()
        {
            if (!string.IsNullOrEmpty(_accessToken) && DateTime.UtcNow < _tokenExpiry)
                return;

            var credentials = new Dictionary<string, string>
            {
                { "client_id", _apiKey },
                { "client_secret", _apiSecret },
                { "grant_type", "client_credentials" }
            };

            _http.DefaultRequestHeaders.Clear();
            var response = await _http.PostAsync("oauth2/token", new FormUrlEncodedContent(credentials));
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

        public async Task<string> CollectAsync(StanbicCollectRequestDto request)
        {
            await EnsureAccessTokenAsync();
            SetHeaders();
            var response = await _http.PostAsJsonAsync("collections/v1/collect", request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> GetCollectStatusAsync(StanbicCollectStatusRequestDto request)
        {
            await EnsureAccessTokenAsync();
            SetHeaders();
            var response = await _http.GetAsync($"collections/v1/collect/{request.TransactionId}");
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> TransferAsync(StanbicTransferRequestDto request)
        {
            await EnsureAccessTokenAsync();
            SetHeaders();
            var response = await _http.PostAsJsonAsync("transfers/v1/transfer", request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> GetTransferStatusAsync(StanbicTransferStatusRequestDto request)
        {
            await EnsureAccessTokenAsync();
            SetHeaders();
            var response = await _http.GetAsync($"transfers/v1/transfer/{request.TransactionId}");
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