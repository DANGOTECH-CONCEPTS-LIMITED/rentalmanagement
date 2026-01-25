using System.Threading.Tasks;
using Domain.Dtos.Airtel;

namespace Application.Interfaces.Collecto
{
    public interface IAirtelApiClient
    {
        Task<string> GetAccessTokenAsync();
        Task<string> CollectAsync(CollectRequestDto request);
        Task<string> GetCollectStatusAsync(CollectStatusRequestDto request);
        Task<string> DisburseAsync(DisburseRequestDto request);
        Task<string> GetDisburseStatusAsync(DisburseStatusRequestDto request);
    }
}