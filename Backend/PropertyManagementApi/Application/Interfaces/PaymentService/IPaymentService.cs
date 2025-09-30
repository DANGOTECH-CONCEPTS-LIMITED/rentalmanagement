using Domain.Dtos.Payments;
using Domain.Entities.PropertyMgt;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.PaymentService
{
    public interface IPaymentService
    {
        Task MakeTenantPaymentAsync(TenantPaymentDto paymentDto);
        Task<IEnumerable<TenantPayment>> GetAllPaymentsAsync();
        Task<TenantPayment> GetPaymentByIdAsync(int id);
        Task UpdatePaymentAsync(TenantPayment pymt);
        Task DeletePaymentAsync(int id);
        Task<IEnumerable<TenantPayment>> GetPaymentsByTenantIdAsync(int tenantId);
        Task<IEnumerable<TenantPayment>> GetPaymentsByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<TenantPayment>> GetPaymentsByStatusAsync(string status);
        Task<IEnumerable<TenantPayment>> GetPaymentsByMethodAsync(string method);
        Task<IEnumerable<TenantPayment>> GetPaymentsByVendorAsync(string vendor);
        Task<IEnumerable<TenantPayment>> GetPaymentsByTypeAsync(string type);
        Task<IEnumerable<TenantPayment>> GetPaymentsByTransactionIdAsync(string transactionId);
        Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAsync(int propertyId);
        Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndDateRangeAsync(int propertyId, DateTime startDate, DateTime endDate);
        Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndStatusAsync(int propertyId, string status);
        Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndMethodAsync(int propertyId, string method);
        Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndVendorAsync(int propertyId, string vendor);
        Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndTypeAsync(int propertyId, string type);
        Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndTransactionIdAsync(int propertyId, string transactionId);
        Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndTenantIdAsync(int propertyId, int tenantId);
        Task<IEnumerable<TenantPayment>> GetTenantPaymentsByLandLordIdAsync(int landlordid);
        Task<IEnumerable<TenantPayment>> GetTenantPaymentsByLandLordIdAndDateRangeAsync(int landlordid, DateTime startDate, DateTime endDate);
        Task<IEnumerable<TenantPayment>> GetTenantPaymentsByLandLordIdAndStatusAsync(int landlordid, string status);
        Task<IEnumerable<TenantPayment>> GetTenantPaymentsByLandLordIdAndMethodAsync(int landlordid, string method);


        Task UpdatePaymentStatus(string status, string transactionid,string reason,string vendorTranRef,string TranType);
        Task UpdateUtilityPaymentSmsSent(UtilityPayment utilityPayment);

        Task MakeUtilityPayment(UtilityPaymentDto utilityPayment);
        Task<IEnumerable<UtilityPayment>> GetUtilityPaymentByStatus(string status);

        Task<IEnumerable<UtilityPayment>> GetUtilityPaymentByDateRange(DateTime startDate, DateTime endDate);

        Task<IEnumerable<UtilityPayment>> GetUtilityPaymentByMeterNumber(string method);
        Task<IEnumerable<UtilityPayment>> GetUtilityPymtsPendingTokenGeneration();
        Task<IEnumerable<UtilityPayment>> GetUtilityPymtsPendingSmsSent();
        Task UpdateUtilityPayment(UtilityPayment utilityPayment);
        Task<IEnumerable<UtilityPayment>> GetUtilityPaymentsByLandlordIdAsync(int landlordId);

        Task UpdateUtilityPaymentWithVendorId(int tranid, string vendorref, string vendor, DateTime utilitypaymentdate);

        Task<IEnumerable<WalletTransaction>> GetWalletTransactionByStatus(string status);
        Task UpdateWalletTransaction(WalletTransaction walletTransaction);
        Task ReverseWalletTransaction(WalletTransaction walletTransaction);

    }
}
