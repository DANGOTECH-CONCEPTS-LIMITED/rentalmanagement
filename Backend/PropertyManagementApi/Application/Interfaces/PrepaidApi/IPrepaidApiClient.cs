using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Dtos.PrepaidApi;

namespace Application.Interfaces.PrepaidApi
{
    public interface IPrepaidApiClient
    {
        Task<string> SearchCustomerAsync(CustomerSearchDto searchDto);
        Task<PurchasePreviewDto> PreviewAsync(string token, decimal amount);
        Task<PurchaseResultDto> PurchaseAsync(string token, decimal amount);
    }
}
