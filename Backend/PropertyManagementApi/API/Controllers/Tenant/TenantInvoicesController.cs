using Application.Interfaces.Tenant;
using Domain.Dtos.Tenant.Invoice;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Tenant
{
    [Route("api/[controller]")]
    [ApiController]
    public class TenantInvoicesController : ControllerBase
    {
        private readonly ITenantInvoiceService _service;

        public TenantInvoicesController(ITenantInvoiceService service)
        {
            _service = service;
        }

        [HttpPost("/CreateTenantInvoice")]
        [Authorize]
        public async Task<IActionResult> CreateTenantInvoice([FromBody] CreateTenantInvoiceDto dto)
        {
            try
            {
                var invoice = await _service.CreateInvoiceAsync(dto);
                return Ok(invoice);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetInvoicesByTenantId/{tenantId}")]
        [Authorize]
        public async Task<IActionResult> GetInvoicesByTenantId(int tenantId)
        {
            try
            {
                var invoices = await _service.GetInvoicesByTenantIdAsync(tenantId);
                return Ok(invoices);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetInvoicesByLandLordId/{landlordId}")]
        [Authorize]
        public async Task<IActionResult> GetInvoicesByLandLordId(int landlordId)
        {
            try
            {
                var invoices = await _service.GetInvoicesByLandlordIdAsync(landlordId);
                return Ok(invoices);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetInvoiceById/{invoiceId}")]
        [Authorize]
        public async Task<IActionResult> GetInvoiceById(int invoiceId)
        {
            try
            {
                var invoice = await _service.GetInvoiceByIdAsync(invoiceId);
                return Ok(invoice);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("/ApplyPaymentToInvoice/{invoiceId}")]
        [Authorize]
        public async Task<IActionResult> ApplyPaymentToInvoice(int invoiceId, [FromBody] ApplyPaymentDto dto)
        {
            try
            {
                var invoice = await _service.ApplyPaymentToInvoiceAsync(invoiceId, dto.PaymentAmount);
                return Ok(invoice);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        public sealed class ApplyPaymentDto
        {
            public double PaymentAmount { get; set; }
        }

        [HttpPut("/UpdateInvoiceStatus/{invoiceId}")]
        [Authorize]
        public async Task<IActionResult> UpdateInvoiceStatus(int invoiceId, [FromBody] UpdateTenantInvoiceStatusDto dto)
        {
            try
            {
                var invoice = await _service.UpdateInvoiceStatusAsync(invoiceId, dto);
                return Ok(invoice);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetTenantProfile/{tenantId}")]
        [Authorize]
        public async Task<IActionResult> GetTenantProfile(int tenantId)
        {
            try
            {
                var profile = await _service.GetTenantProfileAsync(tenantId);
                return Ok(profile);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
