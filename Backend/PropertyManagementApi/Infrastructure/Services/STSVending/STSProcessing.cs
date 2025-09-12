using Application.Interfaces.STSVending;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Services.STSVending
{
    public class STSProcessing : ISTSProcessing
    {
        private readonly HttpClient _httpClient;
        private readonly string _userid;
        private readonly string _password;
        private readonly string _UseTypeId;
        private readonly string _baseurl;

        public STSProcessing(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _userid = config["STSPrepaid:UserId"];
            _password = config["STSPrepaid:Password"];
            _UseTypeId = config["STSPrepaid:UseTypeId"];
            _baseurl = config["STSPrepaid:BaseUrl"];

        }
        public async Task<string> ValidateSTSMeter(string meterno)
        {
            string endpoint = $"{_baseurl}GetContractInfo?UserId={_userid}&Password={_password}&MeterType=2&MeterCode={meterno}";
            var response = await _httpClient.GetAsync(endpoint);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }
    }
}
