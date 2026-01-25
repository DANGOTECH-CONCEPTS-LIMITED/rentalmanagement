using System.Threading.Tasks;
using Domain.Dtos.MtnMomo;

namespace Application.Interfaces.Collecto
{
    public interface IMtnMomoApiClient
    {
        Task<string> GetAccessTokenAsync();
        Task<string> RequestToPayAsync(RequestToPayRequestDto request);
        Task<string> GetRequestToPayStatusAsync(RequestToPayStatusRequestDto request);
        Task<string> TransferAsync(TransferRequestDto request);
        Task<string> GetTransferStatusAsync(TransferStatusRequestDto request);
    }
}