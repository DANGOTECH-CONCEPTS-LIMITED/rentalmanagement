using Application.Interfaces.SMS;
using Domain.Entities.External;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using static System.Net.WebRequestMethods;

namespace Infrastructure.Services.SMS
{
    public class SmsProcessor : ISmsProcessor
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<SmsProcessor> _logger;
        private readonly SmsApiSettings _settings;
        private readonly string _africatalkingbaseurl;
        private readonly string _africatalkingapiKey;
        private readonly string _africatalkingusername;
        private readonly string _africatalkingsenderid;

        public SmsProcessor(HttpClient httpClient, IConfiguration config, ILogger<SmsProcessor> logger)
        {
            _httpClient = httpClient;
            _logger = logger;

            _settings = new SmsApiSettings
            {
                Username = config["SmsApi:username"] ?? throw new ArgumentNullException("SmsApi:username"),
                Password = config["SmsApi:password"] ?? throw new ArgumentNullException("SmsApi:password"),
                SenderId = config["SmsApi:senderId"] ?? throw new ArgumentNullException("SmsApi:senderId"),
                BaseUrl = config["SmsApi:BaseUrl"] ?? throw new ArgumentNullException("SmsApi:BaseUrl")
            };
            _africatalkingbaseurl = config["AfricaTalkingSmsApi:BaseUrl"];
            _africatalkingapiKey = config["AfricaTalkingSmsApi:_apiKey"];
            _africatalkingusername = config["AfricaTalkingSmsApi:_username"];
            _africatalkingsenderid = config["AfricaTalkingSmsApi:_senderId"];
        }

        public async Task<bool> SendAsync(string phoneNumber, string message)
        {
            var payload = new SmsRequest
            {
                Method = "SendSms",
                UserData = new UserData
                {
                    Username = _settings.Username,
                    Password = _settings.Password
                },
                MsgData = new[]
                {
                    new MessageData
                    {
                        Number = phoneNumber,
                        Message = message,
                        SenderId = _settings.SenderId,
                        Priority = "0"
                    }
                }
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.PostAsync(_settings.BaseUrl, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("SMS sent to {PhoneNumber}", phoneNumber);
                    return true;
                }
                else
                {
                    _logger.LogWarning("Failed to send SMS. Status: {StatusCode}, Response: {Response}", response.StatusCode, responseBody);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending SMS to {PhoneNumber}", phoneNumber);
                return false;
            }
        }

        public async Task<bool> SendAfricaTalkingSms(AfricasTalkingSmsRequest africasTalkingrq)
        {
            africasTalkingrq.username = _africatalkingusername;
            var json = JsonSerializer.Serialize(africasTalkingrq);

            using var request = new HttpRequestMessage(HttpMethod.Post, _africatalkingbaseurl);
            request.Headers.Add("Accept", "application/json");
            request.Headers.Add("apiKey", _africatalkingapiKey);

            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            using var response = await _httpClient.SendAsync(request);

            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return false;//throw new Exception($"Africa's Talking SMS failed. Status: {response.StatusCode}, Response: {responseContent}");
            }

            return true;
        }

        private class SmsApiSettings
        {
            public string Username { get; set; } = null!;
            public string Password { get; set; } = null!;
            public string SenderId { get; set; } = null!;
            public string BaseUrl { get; set; } = null!;
        }

        private class SmsRequest
        {
            [JsonPropertyName("method")]
            public string Method { get; set; } = "SendSms";

            [JsonPropertyName("userdata")]
            public UserData UserData { get; set; } = null!;

            [JsonPropertyName("msgdata")]
            public MessageData[] MsgData { get; set; } = null!;
        }

        private class UserData
        {
            [JsonPropertyName("username")]
            public string Username { get; set; } = null!;

            [JsonPropertyName("password")]
            public string Password { get; set; } = null!;
        }

        private class MessageData
        {
            [JsonPropertyName("number")]
            public string Number { get; set; } = null!;

            [JsonPropertyName("message")]
            public string Message { get; set; } = null!;

            [JsonPropertyName("senderid")]
            public string SenderId { get; set; } = null!;

            [JsonPropertyName("priority")]
            public string Priority { get; set; } = "0";
        }
    }
}
