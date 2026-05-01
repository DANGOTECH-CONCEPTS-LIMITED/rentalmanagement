using Application.Interfaces.Collecto;
using Application.Interfaces.SMS;
using Domain.Dtos.Collecto;
using Domain.Entities.External;
using Dtos.Collecto;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Infrastructure.Services.Collecto
{
    public class CollectoService : ICollectoApiClient
    {
        private readonly HttpClient _http;
        private readonly ISmsProcessor _smsprocessor;
        private readonly string _username;
        private readonly string _apiKey;
        private readonly string _baseUrl;
 
        public CollectoService(HttpClient http, IConfiguration config,ISmsProcessor smsProcessor)
        {
            _http = http;
            _username = config["Collecto:Username"];
            _apiKey = config["Collecto:ApiKey"];
            _baseUrl = config["Collecto:BaseUrl"];
            _smsprocessor = smsProcessor;
            
        }

        private void SetHeaders()
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("x-api-key", _apiKey);
            //add user agent 
            _http.DefaultRequestHeaders.Add("User-Agent", "DangoTech");
            _http.BaseAddress = new Uri(_baseUrl);
        }

        public async Task<string> RequestToPayAsync(RequestToPayRequestDto request)
        {
            SetHeaders();
            var res = await _http.PostAsJsonAsync($"{_username}/requestToPay", request);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadAsStringAsync();
        }

        public async Task<string> GetRequestToPayStatusAsync(RequestToPayStatusRequestDto request)
        {
            SetHeaders();
            var res = await _http.PostAsJsonAsync($"{_username}/requestToPayStatus", request);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadAsStringAsync();
        }

        public async Task<string> ServicePaymentAsync(ServicePaymentRequestDto request)
        {
            SetHeaders();
            var res = await _http.PostAsJsonAsync($"{_username}/servicePayment", request);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadAsStringAsync();
        }

        public async Task<string> GetServicePaymentStatusAsync(ServicePaymentStatusRequestDto request)
        {
            SetHeaders();
            var res = await _http.PostAsJsonAsync($"{_username}/servicePaymentStatus", request);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadAsStringAsync();
        }


        public async Task<string> SendSingleSmsAsync(SendSingleSmsRequestDto request)
        {
            var africatalkngsms = new AfricasTalkingSmsRequest
            {
                message = request.Message,
                phoneNumbers = new List<string>
        {
            request.Phone
        }
            };

            var isSent = await _smsprocessor.SendAfricaTalkingSms(africatalkngsms);

            //var isSent = await _smsprocessor.SendAsync(request.Phone, request.Message);

            if (isSent)
            {
                return "Message sent successfully";
            }

            return "Failed to send message";
        }

        public async Task<string> GetCurrentBalanceAsync(CurrentBalanceRequestDto request)
        {
            SetHeaders();
            var res = await _http.PostAsJsonAsync($"{_username}/currentBalance", request);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadAsStringAsync();
        }

        public async Task<string> VerifyPhoneNumberAsync(VerifyPhoneNumberRequestDto request)
        {
            SetHeaders();
            var res = await _http.PostAsJsonAsync($"{_username}/verifyPhoneNumber", request);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadAsStringAsync();
        }

        public async Task<string> InitiatePayoutAsync(InitiatePayoutRequestDto request)
        {
            SetHeaders();
            var res = await _http.PostAsJsonAsync($"{_username}/initiatePayout", request);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadAsStringAsync();
        }

        public async Task<string> GetPayoutStatusAsync(PayoutStatusRequestDto request)
        {
            SetHeaders();
            var res = await _http.PostAsJsonAsync($"{_username}/payoutStatus", request);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadAsStringAsync();
        }

        public async Task<string> GetSupportedBanksAsync(string request)
        {
            SetHeaders();
            var res = await _http.PostAsJsonAsync($"{_username}/supportedBanks", request);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadAsStringAsync();
        }

        public async Task<string> InitiateBankPayoutAsync(InitiatePayoutBankRequestDto request)
        {
            SetHeaders();
            var res = await _http.PostAsJsonAsync($"{_username}/initiatePayout", request);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadAsStringAsync();
        }

        public Task<string> WithdrawToCollectoApi(CollectoWithdrawRequest collectoWithdrawRequest)
        {
            SetHeaders();
            var res = _http.PostAsJsonAsync($"{_username}/walletToWallet", collectoWithdrawRequest);
            res.Result.EnsureSuccessStatusCode();
            return res.Result.Content.ReadAsStringAsync();
        }

        public async Task<CollectoWalletWithdrawalExecutionResultDto> WithdrawFromCollectoWallet(WithdrawFromCollectoWalletDto walletDto)
        {
            SetHeaders();
            var requestUrl = new Uri(_http.BaseAddress!, $"{_username}/withdrawFromWallet").ToString();
            var requestPayload = JsonSerializer.Serialize(walletDto);

            try
            {
                var response = await _http.PostAsJsonAsync($"{_username}/withdrawFromWallet", walletDto);
                var responsePayload = await response.Content.ReadAsStringAsync();

                return new CollectoWalletWithdrawalExecutionResultDto
                {
                    RequestUrl = requestUrl,
                    RequestPayload = requestPayload,
                    ResponsePayload = responsePayload,
                    HttpStatusCode = (int)response.StatusCode,
                    Status = response.StatusCode.ToString(),
                    IsSuccess = response.IsSuccessStatusCode,
                    ErrorMessage = response.IsSuccessStatusCode ? string.Empty : responsePayload,
                };
            }
            catch (Exception ex)
            {
                return new CollectoWalletWithdrawalExecutionResultDto
                {
                    RequestUrl = requestUrl,
                    RequestPayload = requestPayload,
                    ResponsePayload = string.Empty,
                    HttpStatusCode = (int)HttpStatusCode.InternalServerError,
                    Status = HttpStatusCode.InternalServerError.ToString(),
                    IsSuccess = false,
                    ErrorMessage = ex.Message,
                };
            }
        }

        
    }
}
