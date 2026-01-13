using System.Threading.Tasks;

namespace Application.Interfaces.Meter
{
    public interface IMeterTokenService
    {
        Task GenerateTokensForAllMetersAsync(decimal amount);
    }
}