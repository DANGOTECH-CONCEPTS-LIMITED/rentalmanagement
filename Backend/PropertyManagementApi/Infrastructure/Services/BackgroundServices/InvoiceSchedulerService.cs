using Application.Interfaces.SMS;
using Application.Interfaces.Tenant;
using Domain.Dtos.Tenant.Invoice;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BackgroundServices
{
    /// <summary>
    /// Runs daily and generates monthly rent invoices for all active contracts,
    /// then notifies each tenant via SMS.
    /// Configure via appsettings: InvoiceScheduler:GenerationDayOfMonth (default 1)
    ///                             InvoiceScheduler:DueDays (default 7)
    /// </summary>
    public class InvoiceSchedulerService : BackgroundService
    {
        private readonly ILogger<InvoiceSchedulerService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _config;

        public InvoiceSchedulerService(
            ILogger<InvoiceSchedulerService> logger,
            IServiceScopeFactory scopeFactory,
            IConfiguration config)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
            _config = config;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("InvoiceSchedulerService started.");

            // Check once per hour; generate invoices for any landlord whose configured day matches today.
            using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await GenerateMonthlyInvoicesAsync();
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("InvoiceSchedulerService is stopping.");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "InvoiceSchedulerService encountered an error.");
                }
            }
        }

        private async Task GenerateMonthlyInvoicesAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var invoiceSvc = scope.ServiceProvider.GetRequiredService<ITenantInvoiceService>();
            var sms = scope.ServiceProvider.GetRequiredService<ISmsProcessor>();

            var today = DateTime.UtcNow;
            var globalDueDays = _config.GetValue<int>("InvoiceScheduler:DueDays", 7);

            var contracts = await db.RentalContracts
                .AsNoTracking()
                .Include(c => c.Tenant)
                .Where(c => c.Status.ToLower() == "active" && c.TenantId != null && c.TenantId > 0)
                .ToListAsync();

            // Load per-landlord invoice settings keyed by OwnerId
            var ownerIds = contracts.Select(c => c.OwnerId).Distinct().ToList();
            var landlordSettings = await db.Users
                .AsNoTracking()
                .Where(u => ownerIds.Contains(u.Id))
                .Select(u => new { u.Id, u.InvoiceGenerationDay, u.InvoiceDueDays })
                .ToDictionaryAsync(u => u.Id);

            int created = 0;
            foreach (var contract in contracts)
            {
                // Resolve per-landlord settings, fall back to global config
                var settings = landlordSettings.TryGetValue(contract.OwnerId, out var s) ? s : null;
                var generationDay = settings?.InvoiceGenerationDay ?? _config.GetValue<int>("InvoiceScheduler:GenerationDayOfMonth", 1);
                var dueDays = settings?.InvoiceDueDays ?? globalDueDays;

                // Only generate on the landlord's configured day-of-month
                if (today.Day != generationDay) continue;

                // Skip if a Rent invoice already exists for this tenant this month
                bool alreadyInvoiced = await db.TenantInvoices.AnyAsync(i =>
                    i.TenantId == contract.TenantId &&
                    i.Type == "Rent" &&
                    i.InvoiceDate.Year == today.Year &&
                    i.InvoiceDate.Month == today.Month);

                if (alreadyInvoiced) continue;

                try
                {
                    var invoice = await invoiceSvc.CreateInvoiceAsync(new CreateTenantInvoiceDto
                    {
                        Type = "Rent",
                        Status = "Pending",
                        TenantId = contract.TenantId!.Value,
                        PropertyId = contract.PropertyId ?? 0,
                        PropertyUnitId = contract.UnitId,
                        Amount = contract.RentAmount,
                        InvoiceDate = today,
                        DueDate = today.AddDays(dueDays),
                        Notes = $"Monthly rent — {today:MMMM yyyy}",
                        CreatedByUserId = contract.OwnerId,
                        CreatedByName = "System (Auto)",
                    });

                    // Send SMS notification
                    var phone = contract.Tenant?.PhoneNumber ?? contract.TenantPhone;
                    if (!string.IsNullOrWhiteSpace(phone))
                    {
                        var name = contract.Tenant?.FullName ?? contract.TenantName;
                        var msg = $"Dear {name}, your rent invoice of UGX {contract.RentAmount:N0} " +
                                  $"for {contract.PropertyName} is due on {invoice.DueDate:dd MMM yyyy}. " +
                                  $"Invoice: {invoice.InvoiceNumber}. Thank you.";
                        await sms.SendAsync(phone, msg);
                    }

                    created++;
                    _logger.LogInformation("Created invoice {InvoiceNo} for tenant {TenantId}", invoice.InvoiceNumber, contract.TenantId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to create invoice for contract {ContractId}", contract.Id);
                }
            }

            _logger.LogInformation("InvoiceScheduler: {Count} invoice(s) generated for {Month}", created, today.ToString("MMMM yyyy"));
        }
    }
}
