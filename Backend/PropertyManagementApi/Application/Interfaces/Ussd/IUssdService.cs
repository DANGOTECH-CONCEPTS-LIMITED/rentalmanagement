using Domain.Dtos.Ussd;
using Domain.Entities.USSD;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.Ussd
{
    public interface IUssdService
    {
        public Task<string> HandleAsync(string sessionId, string serviceCode, string phone, string text, string menuCode = "waterpay", string currency = "UGX");
        public Task TouchAsync(UssdSession s, Dictionary<string, string> data);
        public Task DeleteSessionAsync(UssdSession s);
    }
}
