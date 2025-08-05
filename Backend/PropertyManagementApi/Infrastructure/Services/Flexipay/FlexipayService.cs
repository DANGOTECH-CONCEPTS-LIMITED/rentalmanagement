using Application.Interfaces.Flexipay;
using Domain.Dtos.Flexipay;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Headers;
using System.Reflection.Emit;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Infrastructure.Services.Flexipay
{
    public class FlexiPayService : IFlexiPayService
    {
        private readonly TokenProvider _tokenProvider;
        private readonly FlexiPayConfig _config;
        private readonly FlexipaySignatureService _signatureService;

        public FlexiPayService(TokenProvider tokenProvider, IOptions<FlexiPayConfig> config, FlexipaySignatureService signatureService)
        {
            _tokenProvider = tokenProvider;
            _config = config.Value;
            _signatureService = signatureService;
        }

        public async Task<string> GetBearerTokenAsync()
            => await _tokenProvider.GetTokenAsync();

        public async Task<string> GenerateSignatureAsync(string payload)
            => SignatureHelper.GenerateSignature(payload, _config.PrivateKeyPath);

        public async Task<MerchantPaymentResponseDto> InitiateMerchantPaymentAsync(MerchantPaymentRequestDto request)
        {
            var client = new HttpClient();
            var token = await GetBearerTokenAsync();

            var payload = JsonSerializer.Serialize(request);
            payload = Regex.Replace(payload, "\\s+", "");
            var signature = await GenerateSignatureAsync(payload);

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{_config.BaseUrl}/fp/v1.1/merchantpayment")
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            };

            httpRequest.Headers.Add("X-IBM-Client-Id", _config.ClientId);
            httpRequest.Headers.Add("X-IBM-Client-Secret", _config.ClientSecret);
            httpRequest.Headers.Add("x-signature", signature);
            httpRequest.Headers.Add("password", _config.Password);
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.SendAsync(httpRequest);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<MerchantPaymentResponseDto>(responseContent);
        }

        public async Task<TransactionStatusResponseDto> GetTransactionStatusAsync(TransactionStatusRequestDto request)
        {
            var client = new HttpClient();
            var token = await GetBearerTokenAsync();

            var payload = JsonSerializer.Serialize(request);
            payload = Regex.Replace(payload, "\\s+", "");
            var signature = await GenerateSignatureAsync(payload);

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{_config.BaseUrl}/fp/v1.0/GetTransactionStatus")
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            };

            httpRequest.Headers.Add("X-IBM-Client-Id", _config.ClientId);
            httpRequest.Headers.Add("X-IBM-Client-Secret", _config.ClientSecret);
            httpRequest.Headers.Add("x-signature", signature);
            httpRequest.Headers.Add("password", _config.Password);
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.SendAsync(httpRequest);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<TransactionStatusResponseDto>(responseContent);
        }

        public async Task<BillPaymentResponseDto> InitiateBillPaymentAsync(BillPaymentRequestDto request)
        {
            var client = new HttpClient();
            var token = await GetBearerTokenAsync();

            var payload = JsonSerializer.Serialize(request);
            payload = Regex.Replace(payload, "\\s+", "");
            var signature = await GenerateSignatureAsync(payload);

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{_config.BaseUrl}/fp/v1.0/billpayment")
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            };

            httpRequest.Headers.Add("X-IBM-Client-Id", _config.ClientId);
            httpRequest.Headers.Add("X-IBM-Client-Secret", _config.ClientSecret);
            httpRequest.Headers.Add("x-signature", signature);
            httpRequest.Headers.Add("password", _config.Password);
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.SendAsync(httpRequest);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<BillPaymentResponseDto>(responseContent);
        }

        public bool VerifySignature(string payload, string signature)
        => VerifySignature(payload, signature, _config.FlexiPayPublicKeyPath);

        private static bool VerifySignature(string payload, string signature, string publicKeyPath)
        {
            var rsa = RSA.Create();
            rsa.ImportFromPem(File.ReadAllText(publicKeyPath));

            var payloadBytes = Encoding.UTF8.GetBytes(payload);
            var signatureBytes = Convert.FromBase64String(signature);

            return rsa.VerifyData(payloadBytes, signatureBytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        }

        private class SignatureHelper
        {
            public static string GenerateSignature(string payload, string privateKeyPath)
            {
                var rsa = RSA.Create();
                rsa.ImportFromPem(File.ReadAllText(privateKeyPath));

                var payloadBytes = Encoding.UTF8.GetBytes(payload);
                var signatureBytes = rsa.SignData(payloadBytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

                return Convert.ToBase64String(signatureBytes);
            }
        }

    }
}
