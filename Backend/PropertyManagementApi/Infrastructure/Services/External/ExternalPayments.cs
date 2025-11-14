using Application.Interfaces.External;
using Domain.Dtos.External;
using Domain.Dtos.Payments;
using Domain.Entities.External;
using Humanizer;
using Infrastructure.Data;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.PortableExecutable;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Infrastructure.Services.External
{
    public class ExternalPayments : IExternalPayments
    {
        private readonly AppDbContext _dbContext;
        private readonly IConfiguration _cfg;

        public ExternalPayments(AppDbContext dbContext, IConfiguration cfg)
        {
            _dbContext = dbContext;
            _cfg = cfg;
        }

        public async Task RecordMpesaPayment(MpesaCallbackDto mpesadto, string callbackToken, string headers)
        {
            //if (!IsValidCallbackToken(callbackToken))
            //{
            //    throw new UnauthorizedAccessException("Invalid callback token.");
            //    //throw new Un("Invalid callback token.");
            //}
            var payload = JsonSerializer.Serialize(mpesadto);


            var audit = new MpesaCallbackAudit
            {
                Payload = payload,
                Headers = headers,
                TransId = mpesadto?.TransID,
                Amount = mpesadto?.TransAmount,
                BillRefNumber = mpesadto?.BillRefNumber,
                Processed = false,
                ReceivedAt = DateTime.UtcNow
            };
            _dbContext.MpesaCallbackAudits.Add(audit);
            await _dbContext.SaveChangesAsync();
        }

        public async Task RecordVendorPayment(VendorPaymentsDto vendorPayments, string callbackToken)
        {
            if (!IsValidCallbackToken(callbackToken))
            {
                throw new UnauthorizedAccessException("Invalid callback token.");
            }
            var payment = new VendorPayments
            {
                VendorName = vendorPayments.VendorName,
                VendorCode = vendorPayments.VendorCode,
                Amount = vendorPayments.Amount,
                PaymentDate = vendorPayments.PaymentDate,
                PhoneNumber = vendorPayments.PhoneNumber,
                VendorTranId = vendorPayments.VendorTranId,
                TransId = Guid.NewGuid().ToString(),
            };
            _dbContext.VendorPayments.Add(payment);
            await _dbContext.SaveChangesAsync();
        }

        private bool IsValidCallbackToken(string token)
        {
            var expected = _cfg["ExternalApi:CallbackToken"];
            if (string.IsNullOrWhiteSpace(expected))
            {
                //_logger.LogWarning("Callback token not configured. Rejecting request.");
                throw new Exception("Callback token not configured.");
            }
            return !string.IsNullOrWhiteSpace(expected) && token == expected;
        }

        public async Task<VendorPayments> GetVendorPaymentStatus(string vendorPaymentRef,string callbackToken)
        {
            if (!IsValidCallbackToken(callbackToken))
            {
                throw new UnauthorizedAccessException("Invalid callback token.");
            }

            var payment = await _dbContext.VendorPayments
                .FindAsync(vendorPaymentRef);

            if (payment == null)
                throw new KeyNotFoundException("Vendor payment not found.");
            return payment;
        }
    }
}
