using Domain.Dtos.Ussd;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Application.Interfaces.Ussd
{
    public interface IUssdMenuService
    {
        Task<IEnumerable<UssdMenuSummaryDto>> ListMenusAsync(CancellationToken ct = default);
        Task<UssdMenuDto?> GetMenuAsync(string menuCode, CancellationToken ct = default);
        Task<UssdMenuDto> CreateMenuAsync(string code, string title, CancellationToken ct = default);
        Task<UssdMenuDto> SaveMenuAsync(UssdMenuDto menu, CancellationToken ct = default);
    }
}
