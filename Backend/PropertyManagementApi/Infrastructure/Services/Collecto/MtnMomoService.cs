using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Interfaces.Collecto;
using Domain.Dtos.MtnMomo;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services.Collecto
{
    public class MtnMomoService : IMtnMomoApiClient
    {
        private readonly HttpClient _http;
        private readonly string _subscriptionKey;
        private readonly string _apiKey;
        private readonly string _apiSecret;
        private readonly string _baseUrl;
        private readonly string _targetEnvironment;
        private string _accessToken;
        private DateTime _tokenExpiry;

        public MtnMomoService(HttpClient http, IConfiguration config)
        {
            _http = http;
            _subscriptionKey = config["MtnMomo:SubscriptionKey"];
            _apiKey = config["MtnMomo:ApiKey"];
            _apiSecret = config["MtnMomo:ApiSecret"];
            _baseUrl = config["MtnMomo:BaseUrl"];
            _targetEnvironment = config["MtnMomo:TargetEnvironment"];
            _http.BaseAddress = new Uri(_baseUrl);
        }

        private async Task EnsureAccessTokenAsync()
        {
            if (!string.IsNullOrEmpty(_accessToken) && DateTime.UtcNow < _tokenExpiry)
                return;

            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_apiKey}:{_apiSecret}"));
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", _subscriptionKey);
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

            var response = await _http.PostAsync("collection/token/", null);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();
            var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(json);
            _accessToken = tokenResponse.AccessToken;
            _tokenExpiry = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
        }

        private void SetHeaders()
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", _subscriptionKey);
            _http.DefaultRequestHeaders.Add("X-Target-Environment", _targetEnvironment);
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
        }

        public async Task<string> GetAccessTokenAsync()
        {
            await EnsureAccessTokenAsync();
            return _accessToken;
        }

        public async Task<string> RequestToPayAsync(RequestToPayRequestDto request)
        {
            await EnsureAccessTokenAsync();
            SetHeaders();
            var response = await _http.PostAsJsonAsync("collection/v1_0/requesttopay", request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> GetRequestToPayStatusAsync(RequestToPayStatusRequestDto request)
        {
            await EnsureAccessTokenAsync();
            SetHeaders();
            var response = await _http.GetAsync($"collection/v1_0/requesttopay/{request.TransactionId}");
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> TransferAsync(TransferRequestDto request)
        {
            await EnsureAccessTokenAsync();
            SetHeaders();
            var response = await _http.PostAsJsonAsync("disbursement/v1_0/transfer", request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> GetTransferStatusAsync(TransferStatusRequestDto request)
        {
            await EnsureAccessTokenAsync();
            SetHeaders();
            var response = await _http.GetAsync($"disbursement/v1_0/transfer/{request.TransactionId}");
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