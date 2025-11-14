using Domain.Dtos.External;
using Domain.Dtos.Payments;
using Domain.Entities.External;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.External
{
    public interface IExternalPayments
    {
        Task RecordMpesaPayment(MpesaCallbackDto mpesadto, string callbackToken, string headers);
        Task RecordVendorPayment(VendorPaymentsDto vendorPayments, string callbackToken);
        Task<VendorPayments> GetVendorPaymentStatus(string vendorPaymentRef,string callbackToken);
    }
}
