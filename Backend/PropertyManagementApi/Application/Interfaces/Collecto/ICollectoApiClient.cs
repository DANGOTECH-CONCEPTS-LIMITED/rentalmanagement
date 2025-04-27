using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Entities.Collecto;

namespace Application.Interfaces.Collecto
{
    public interface ICollectoApiClient
    {
        Task<string> RequestToPayAsync(RequestToPayRequest request);
        Task<string> GetRequestToPayStatusAsync(RequestToPayStatusRequest request);
        Task<string> ServicePaymentAsync(ServicePaymentRequest request);
        Task<string> GetServicePaymentStatusAsync(ServicePaymentStatusRequest request);
        Task<string> SendSingleSmsAsync(SendSingleSmsRequest request);
        Task<string> GetCurrentBalanceAsync(CurrentBalanceRequest request);
        Task<string> VerifyPhoneNumberAsync(VerifyPhoneNumberRequest request);
        Task<string> InitiatePayoutAsync(InitiatePayoutRequest request);
        Task<string> GetPayoutStatusAsync(PayoutStatusRequest request);
    }
}
