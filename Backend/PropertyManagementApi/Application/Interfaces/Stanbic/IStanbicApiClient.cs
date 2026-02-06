using System.Threading.Tasks;
using Domain.Dtos.Stanbic;

namespace Application.Interfaces.Stanbic
{
    public interface IStanbicApiClient
    {
        Task<string> GetAccessTokenAsync();
        Task<string> CollectAsync(StanbicCollectRequestDto request);
        Task<string> GetCollectStatusAsync(StanbicCollectStatusRequestDto request);
        Task<string> TransferAsync(StanbicTransferRequestDto request);
        Task<string> GetTransferStatusAsync(StanbicTransferStatusRequestDto request);
        Task<string> AccountInquiryAsync(StanbicAccountInquiryRequestDto request);
        Task<string> GetBalanceAsync(StanbicBalanceRequestDto request);
        Task<string> ReverseTransactionAsync(StanbicReverseRequestDto request);
    }
}