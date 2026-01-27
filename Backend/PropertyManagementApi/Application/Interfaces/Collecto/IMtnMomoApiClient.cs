using System.Threading.Tasks;
using Domain.Dtos.MtnMomo;

namespace Application.Interfaces.Collecto
{
    public interface IMtnMomoApiClient
    {
        Task<string> GetAccessTokenAsync();
        Task<string> RequestToPayAsync(MtnMomoRequestToPayRequestDto request);
        Task<string> GetRequestToPayStatusAsync(MtnMomoRequestToPayStatusRequestDto request);
        Task<string> TransferAsync(MtnMomoTransferRequestDto request);
        Task<string> GetTransferStatusAsync(MtnMomoTransferStatusRequestDto request);
    }
}