using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces.Collecto;
using Domain.Dtos.Collecto;
using Dtos.Collecto;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services.Collecto
{
    public class CollectoService : ICollectoApiClient
    {
        private readonly HttpClient _http;
        private readonly string _username;
        private readonly string _apiKey;
        private readonly string _baseUrl;
        public CollectoService(HttpClient http, IConfiguration config)
        {
            _http = http;
            _username = config["Collecto:Username"];
            _apiKey = config["Collecto:ApiKey"];
            _baseUrl = config["Collecto:BaseUrl"];
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
            SetHeaders();
            var res = await _http.PostAsJsonAsync($"{_username}/sendSingleSms", request);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadAsStringAsync();
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
            var res = await _http.PostAsJsonAsync($"{_username}/supportedBanks",request);
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
            var res =  _http.PostAsJsonAsync($"{_username}/walletToWallet", collectoWithdrawRequest);
            res.Result.EnsureSuccessStatusCode();
            return res.Result.Content.ReadAsStringAsync();
        }
    }
}
