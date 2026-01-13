using Domain.Dtos.Payments;
using System.Threading.Tasks;

namespace Application.Interfaces.PaymentService
{
    public interface IExternalPaymentService
    {
        Task<PayInResponseDto> InitiatePayInAsync(PayInRequestDto request);
        Task<PayInResponseDto> GetPayInStatusAsync(string transactionId);
        Task<PayoutResponseDto> InitiatePayoutAsync(PayoutRequestDto request);
        Task<PayoutResponseDto> GetPayoutStatusAsync(string transactionId);
    }
}