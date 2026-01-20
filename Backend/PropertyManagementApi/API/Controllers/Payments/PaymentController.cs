using Application.Interfaces.PaymentService;
using Domain.Dtos.Payments;
using Domain.Entities.PropertyMgt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Payments
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _paymentService;

        public PaymentController(IPaymentService paymentService)
        {
            _paymentService = paymentService;
        }

        [HttpPost("/MakeTenantPayment")]
        [Authorize]
        public async Task<IActionResult> MakeTenantPayment([FromBody] TenantPaymentDto paymentDto)
        {
            try
            {
                await _paymentService.MakeTenantPaymentAsync(paymentDto);
                return Ok("Payment created successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error creating payment: {ex.Message}");
            }
        }

        [HttpGet("/GetAllPayments")]
        [Authorize]
        public async Task<IActionResult> GetAllPayments()
        {
            try
            {
                var payments = await _paymentService.GetAllPaymentsAsync();
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpGet("/GetPaymentById/{id}")]
        [Authorize]
        public async Task<IActionResult> GetPaymentById(int id)
        {
            try
            {
                var payment = await _paymentService.GetPaymentByIdAsync(id);
                return Ok(payment);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payment: {ex.Message}");
            }
        }

        [HttpPut("/UpdatePayment")]
        [Authorize]
        public async Task<IActionResult> UpdatePayment([FromBody] TenantPayment payment)
        {
            try
            {
                await _paymentService.UpdatePaymentAsync(payment);
                return Ok("Payment updated successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error updating payment: {ex.Message}");
            }
        }

        [HttpDelete("/DeletePayment/{id}")]
        [Authorize]
        public async Task<IActionResult> DeletePayment(int id)
        {
            try
            {
                await _paymentService.DeletePaymentAsync(id);
                return Ok("Payment deleted successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error deleting payment: {ex.Message}");
            }
        }

        [HttpGet("/GetPaymentsByTenantId/{tenantId}")]
        [Authorize]
        public async Task<IActionResult> GetPaymentsByTenantId(int tenantId)
        {
            try
            {
                var payments = await _paymentService.GetPaymentsByTenantIdAsync(tenantId);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpGet("/GetPaymentsByDateRange")]
        [Authorize]
        public async Task<IActionResult> GetPaymentsByDateRange([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                var payments = await _paymentService.GetPaymentsByDateRangeAsync(startDate, endDate);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpGet("/GetPaymentsByStatus/{status}")]
        [Authorize]
        public async Task<IActionResult> GetPaymentsByStatus(string status)
        {
            try
            {
                var payments = await _paymentService.GetPaymentsByStatusAsync(status);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpGet("/GetPaymentsByMethod/{method}")]
        [Authorize]
        public async Task<IActionResult> GetPaymentsByMethod(string method)
        {
            try
            {
                var payments = await _paymentService.GetPaymentsByMethodAsync(method);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpGet("/GetPaymentsByVendor/{vendor}")]
        [Authorize]
        public async Task<IActionResult> GetPaymentsByVendor(string vendor)
        {
            try
            {
                var payments = await _paymentService.GetPaymentsByVendorAsync(vendor);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpGet("/GetPaymentsByType/{type}")]
        [Authorize]
        public async Task<IActionResult> GetPaymentsByType(string type)
        {
            try
            {
                var payments = await _paymentService.GetPaymentsByTypeAsync(type);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpGet("/GetPaymentsByTransactionId/{transactionId}")]
        [Authorize]
        public async Task<IActionResult> GetPaymentsByTransactionId(string transactionId)
        {
            try
            {
                var payments = await _paymentService.GetPaymentsByTransactionIdAsync(transactionId);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpGet("/GetTenantPaymentsByPropertyId/{propertyId}")]
        [Authorize]
        public async Task<IActionResult> GetTenantPaymentsByPropertyId(int propertyId)
        {
            try
            {
                var payments = await _paymentService.GetTenantPaymentsByPropertyIdAsync(propertyId);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpGet("/GetTenantPaymentsByPropertyIdAndDateRange")]
        [Authorize]
        public async Task<IActionResult> GetTenantPaymentsByPropertyIdAndDateRange([FromQuery] int propertyId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                var payments = await _paymentService.GetTenantPaymentsByPropertyIdAndDateRangeAsync(propertyId, startDate, endDate);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpGet("/GetTenantPaymentsByPropertyIdAndStatus/{propertyId}/{status}")]
        [Authorize]
        public async Task<IActionResult> GetTenantPaymentsByPropertyIdAndStatus(int propertyId, string status)
        {
            try
            {
                var payments = await _paymentService.GetTenantPaymentsByPropertyIdAndStatusAsync(propertyId, status);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpGet("/GetTenantPaymentsByPropertyIdAndMethod/{propertyId}/{method}")]
        [Authorize]
        public async Task<IActionResult> GetTenantPaymentsByPropertyIdAndMethod(int propertyId, string method)
        {
            try
            {
                var payments = await _paymentService.GetTenantPaymentsByPropertyIdAndMethodAsync(propertyId, method);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpGet("/GetTenantPaymentsByPropertyIdAndVendor/{propertyId}/{vendor}")]
        [Authorize]
        public async Task<IActionResult> GetTenantPaymentsByPropertyIdAndVendor(int propertyId, string vendor)
        {
            try
            {
                var payments = await _paymentService.GetTenantPaymentsByPropertyIdAndVendorAsync(propertyId, vendor);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving payments: {ex.Message}");
            }
        }

        [HttpPost("/MakeUtilityPayment")]
        public async Task<IActionResult> MakeUtilityPayment([FromBody] UtilityPaymentDto utilityPaymentDto)
        {
            try
            {
                string transactionid = await _paymentService.MakeUtilityPayment(utilityPaymentDto);
                var response = new System.Collections.Generic.Dictionary<string, string>
                {
                    { "TranID", transactionid }
                };
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error creating utility payment: {ex.Message}");
            }
        }

        [HttpGet("/GetUtilityPaymentByTranId/{transactionId}")]
        [Authorize]
        public async Task<IActionResult> GetUtilityPaymentByTranId(string transactionId)
        {
            try
            {
                var utilityPayments = await _paymentService.GetUtilityPaymentByTranId(transactionId);
                return Ok(utilityPayments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving utility payments: {ex.Message}");
            }
        }

        [HttpGet("/GetUtilityPaymentByDateRange/{startdate}/{enddate}")]
        public async Task<IActionResult> GetUtilityPaymentByDateRange(DateTime startdate, DateTime enddate)
        {
            try
            {
                var utilityPayments = await _paymentService.GetUtilityPaymentByDateRange(startdate, enddate);
                return Ok(utilityPayments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving utility payments: {ex.Message}");
            }
        }

        [HttpGet("/GetUtilityPaymentByMeterNumber/{meternumber}")]
        public async Task<IActionResult> GetUtilityPaymentByMeterNumber(string meternumber)
        {
            try
            {
                var utilityPayments = await _paymentService.GetUtilityPaymentByMeterNumber(meternumber);
                return Ok(utilityPayments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving utility payments: {ex.Message}");
            }
        }

        [HttpGet("/GetUtilityPaymentsByLandlordIdAsync/{landlordid}")]
        [Authorize]
        public async Task<IActionResult> GetUtilityPaymentsByLandlordIdAsync(int landlordid)
        {
            try
            {
                var utilityPayments = await _paymentService.GetUtilityPaymentsByLandlordIdAsync(landlordid);
                return Ok(utilityPayments);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving utility payments: {ex.Message}");
            }
        }

        [HttpPut("/UpdateUtilityPaymentWithVendorId")]
        [Authorize]
        public async Task<IActionResult> UpdateUtilityPaymentWithVendorId(
        [FromQuery] int tranid,
        [FromQuery] string vendorref,
        [FromQuery] string vendor,
        [FromQuery] DateTime utilitypaymentdate)
            {
                try
                {
                    await _paymentService.UpdateUtilityPaymentWithVendorId(tranid, vendorref, vendor, utilitypaymentdate);
                    return Ok(new { message = "Utility payment updated successfully." });
                }
                catch (Exception ex)
                {
                    return BadRequest(new { error = $"Error updating utility payment: {ex.Message}" });
                }
            }
    }
}
