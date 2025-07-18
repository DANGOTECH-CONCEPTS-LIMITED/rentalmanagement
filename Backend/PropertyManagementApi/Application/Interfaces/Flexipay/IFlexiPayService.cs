using Domain.Dtos.Flexipay;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.Flexipay
{
    public interface IFlexiPayService
    {
        Task<string> GetBearerTokenAsync();
        Task<string> GenerateSignatureAsync(string payload);
        Task<MerchantPaymentResponseDto> InitiateMerchantPaymentAsync(MerchantPaymentRequestDto request);
        Task<TransactionStatusResponseDto> GetTransactionStatusAsync(TransactionStatusRequestDto request);
        Task<BillPaymentResponseDto> InitiateBillPaymentAsync(BillPaymentRequestDto request);
        bool VerifySignature(string payload, string signature);
    }
}
