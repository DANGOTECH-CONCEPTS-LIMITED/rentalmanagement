using Domain.Dtos.Flexipay;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Infrastructure.Services.Flexipay
{
    public class TokenProvider
    {
        private readonly FlexiPayConfig _config;
        private string _token;
        private DateTime _tokenExpiry;

        public TokenProvider(IOptions<FlexiPayConfig> config)
        {
            _config = config.Value;
        }

        public async Task<string> GetTokenAsync()
        {
            if (!string.IsNullOrEmpty(_token) && _tokenExpiry > DateTime.UtcNow)
                return _token;

            using var client = new HttpClient();
            var auth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_config.ClientId}:{_config.ClientSecret}"));

            var request = new HttpRequestMessage(HttpMethod.Post, _config.TokenUrl);
            request.Headers.Add("Authorization", $"Basic {auth}");
            request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            { "grant_type", "client_credentials" },
            { "scope", "Create" }
        });

            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            var tokenResponse = JsonSerializer.Deserialize<JsonElement>(json);
            _token = tokenResponse.GetProperty("access_token").GetString();
            _tokenExpiry = DateTime.UtcNow.AddSeconds(850); // 15 min minus buffer
            return _token;
        }
    }

}
