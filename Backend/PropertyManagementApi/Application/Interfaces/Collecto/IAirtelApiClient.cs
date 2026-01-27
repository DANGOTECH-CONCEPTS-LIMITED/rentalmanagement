using System.Threading.Tasks;
using Domain.Dtos.Airtel;

namespace Application.Interfaces.Collecto
{
    public interface IAirtelApiClient
    {
        Task<string> GetAccessTokenAsync();
        Task<string> CollectAsync(AirtelCollectRequestDto request);
        Task<string> GetCollectStatusAsync(AirtelCollectStatusRequestDto request);
        Task<string> DisburseAsync(AirtelDisburseRequestDto request);
        Task<string> GetDisburseStatusAsync(AirtelDisburseStatusRequestDto request);
    }
}