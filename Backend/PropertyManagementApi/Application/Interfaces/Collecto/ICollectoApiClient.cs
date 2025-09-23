using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Dtos.Collecto;

namespace Application.Interfaces.Collecto
{
    public interface ICollectoApiClient
    {
        Task<string> RequestToPayAsync(RequestToPayRequestDto request);
        Task<string> GetRequestToPayStatusAsync(RequestToPayStatusRequestDto request);
        Task<string> ServicePaymentAsync(ServicePaymentRequestDto request);
        Task<string> GetServicePaymentStatusAsync(ServicePaymentStatusRequestDto request);
        Task<string> SendSingleSmsAsync(SendSingleSmsRequestDto request);
        Task<string> GetCurrentBalanceAsync(CurrentBalanceRequestDto request);
        Task<string> VerifyPhoneNumberAsync(VerifyPhoneNumberRequestDto request);
        Task<string> InitiatePayoutAsync(InitiatePayoutRequestDto request);
        Task<string> GetPayoutStatusAsync(PayoutStatusRequestDto request);
        Task<string> GetSupportedBanksAsync(string request);
        Task<string> InitiateBankPayoutAsync(InitiatePayoutBankRequestDto request);
    }
}
