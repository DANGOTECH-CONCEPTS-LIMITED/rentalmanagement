using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Flexipay
{
    public class FlexiPayConfig
    {
        public string ClientId { get; set; }
        public string ClientSecret { get; set; }
        public string Password { get; set; }
        public string BaseUrl { get; set; }
        public string TokenUrl { get; set; }
        public string PrivateKeyPath { get; set; }
        public string CertificatePath { get; set; }
        public string FlexiPayPublicKeyPath { get; set; }
    }
}
