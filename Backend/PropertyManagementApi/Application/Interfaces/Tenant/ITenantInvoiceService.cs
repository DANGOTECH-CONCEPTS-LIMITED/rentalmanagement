using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Dtos.Tenant;
using Domain.Dtos.Tenant.Invoice;
using Domain.Entities.PropertyMgt;

namespace Application.Interfaces.Tenant
{
    public interface ITenantInvoiceService
    {
        Task<TenantInvoice> CreateInvoiceAsync(CreateTenantInvoiceDto dto);
        Task<IEnumerable<TenantInvoice>> GetInvoicesByTenantIdAsync(int tenantId);
        Task<IEnumerable<TenantInvoice>> GetInvoicesByLandlordIdAsync(int landlordId);
        Task<TenantInvoice> GetInvoiceByIdAsync(int invoiceId);
        Task<TenantInvoice> UpdateInvoiceStatusAsync(int invoiceId, UpdateTenantInvoiceStatusDto dto);

        Task<TenantProfileDto> GetTenantProfileAsync(int tenantId);
    }
}
