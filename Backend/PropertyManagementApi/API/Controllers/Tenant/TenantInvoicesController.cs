using Application.Interfaces.Tenant;
using Domain.Dtos.Tenant.Invoice;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace API.Controllers.Tenant
{
    [Route("api/[controller]")]
    [ApiController]
    public class TenantInvoicesController : ControllerBase
    {
        private readonly ITenantInvoiceService _service;
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public TenantInvoicesController(ITenantInvoiceService service, AppDbContext db, IConfiguration config)
        {
            _service = service;
            _db = db;
            _config = config;
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

        [HttpGet("/GetCustomerStatement/{tenantId}")]
        [Authorize]
        public async Task<IActionResult> GetCustomerStatement(int tenantId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            try
            {
                var statement = await _service.GetCustomerStatementAsync(tenantId, from, to);
                return Ok(statement);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Manually triggers monthly invoice generation (for testing).
        /// Bypasses the day-of-month check so it runs immediately regardless of date.
        /// Optional: pass tenantId to generate only for one tenant.
        /// </summary>
        [HttpPost("/TriggerMonthlyInvoiceGeneration")]
        [Authorize]
        public async Task<IActionResult> TriggerMonthlyInvoiceGeneration([FromQuery] int? tenantId = null)
        {
            var today = DateTime.Now;
            var globalDueDays = _config.GetValue<int>("InvoiceScheduler:DueDays", 7);

            var contractsQuery = _db.RentalContracts
                .AsNoTracking()
                .Include(c => c.Tenant)
                .Where(c => c.Status.ToLower() == "active" && c.TenantId != null && c.TenantId > 0);

            if (tenantId.HasValue)
                contractsQuery = contractsQuery.Where(c => c.TenantId == tenantId.Value);

            var contracts = await contractsQuery.ToListAsync();

            var ownerIds = contracts.Select(c => c.OwnerId).Distinct().ToList();
            var landlordSettings = await _db.Users
                .AsNoTracking()
                .Where(u => ownerIds.Contains(u.Id))
                .Select(u => new { u.Id, u.InvoiceDueDays })
                .ToDictionaryAsync(u => u.Id);

            int created = 0;
            var skipped = new List<string>();

            foreach (var contract in contracts)
            {
                // Skip if a Rent invoice already exists for this tenant this month
                bool alreadyInvoiced = await _db.TenantInvoices.AnyAsync(i =>
                    i.TenantId == contract.TenantId &&
                    i.Type == "Rent" &&
                    i.InvoiceDate.Year == today.Year &&
                    i.InvoiceDate.Month == today.Month);

                if (alreadyInvoiced)
                {
                    skipped.Add($"Tenant {contract.TenantId} ({contract.TenantName}) — already invoiced for {today:MMMM yyyy}");
                    continue;
                }

                var landlord = landlordSettings.TryGetValue(contract.OwnerId, out var ls) ? ls : null;
                var dueDays = landlord?.InvoiceDueDays ?? globalDueDays;

                try
                {
                    await _service.CreateInvoiceAsync(new CreateTenantInvoiceDto
                    {
                        Type = "Rent",
                        Status = "Pending",
                        TenantId = contract.TenantId!.Value,
                        PropertyId = contract.PropertyId ?? 0,
                        PropertyUnitId = contract.UnitId,
                        Amount = contract.RentAmount,
                        InvoiceDate = today,
                        DueDate = today.AddDays(dueDays),
                        Notes = $"Monthly rent — {today:MMMM yyyy} (manual trigger)",
                        CreatedByUserId = contract.OwnerId,
                        CreatedByName = "System (Manual Trigger)",
                    });
                    created++;
                }
                catch (Exception ex)
                {
                    skipped.Add($"Tenant {contract.TenantId} ({contract.TenantName}) — error: {ex.Message}");
                }
            }

            return Ok(new
            {
                message = $"{created} invoice(s) generated for {today:MMMM yyyy}.",
                created,
                skipped,
            });
        }
    }
}
