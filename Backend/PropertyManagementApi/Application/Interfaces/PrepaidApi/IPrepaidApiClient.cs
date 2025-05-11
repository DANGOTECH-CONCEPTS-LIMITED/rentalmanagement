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
        Task<string> PreviewAsync(PurchasePreviewDto previewDto);
        Task<PurchaseApiResponse> PurchaseAsync(PurchasePreviewDto purchaseDto);
    }
}
