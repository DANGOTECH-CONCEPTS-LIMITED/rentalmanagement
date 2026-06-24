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
        Task<TenantInvoice> ApplyPaymentToInvoiceAsync(int invoiceId, double paymentAmount);
        Task<TenantInvoice> CreateSecurityDepositInvoiceAsync(int tenantId, int propertyId, int? propertyUnitId, double amount, int createdByUserId, string? notes = null);
        Task<TenantInvoice> SettleSecurityDepositAsync(int tenantId, int propertyId, int? propertyUnitId, double deductionAmount, double refundAmount, int processedByUserId, string? notes = null);

        Task<TenantProfileDto> GetTenantProfileAsync(int tenantId);
        Task<CustomerStatementDto> GetCustomerStatementAsync(int tenantId, DateTime? from = null, DateTime? to = null);
    }
}
