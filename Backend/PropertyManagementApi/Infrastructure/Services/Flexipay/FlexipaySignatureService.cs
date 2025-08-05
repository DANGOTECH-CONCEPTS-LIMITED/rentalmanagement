using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Services.Flexipay
{
    public class FlexipaySignatureService
    {
        private readonly string _privateKeyPem;

        public FlexipaySignatureService(IConfiguration config)
        {
            // Store your private key in a secure file or appsettings
            _privateKeyPem = File.ReadAllText("private_key.pem"); // or config["Flexipay:PrivateKey"]
        }

        public string SignPayload(string payload)
        {
            using var rsa = RSA.Create();
            rsa.ImportFromPem(_privateKeyPem.ToCharArray());

            var dataBytes = Encoding.UTF8.GetBytes(payload);
            var signedBytes = rsa.SignData(dataBytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

            return Convert.ToBase64String(signedBytes);
        }
    }
}
