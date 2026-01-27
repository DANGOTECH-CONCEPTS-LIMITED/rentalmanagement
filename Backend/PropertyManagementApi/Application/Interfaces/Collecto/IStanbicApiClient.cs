using System.Threading.Tasks;
using Domain.Dtos.Stanbic;

namespace Application.Interfaces.Collecto
{
    public interface IStanbicApiClient
    {
        Task<string> GetAccessTokenAsync();
        Task<string> CollectAsync(StanbicCollectRequestDto request);
        Task<string> GetCollectStatusAsync(StanbicCollectStatusRequestDto request);
        Task<string> TransferAsync(StanbicTransferRequestDto request);
        Task<string> GetTransferStatusAsync(StanbicTransferStatusRequestDto request);
    }
}