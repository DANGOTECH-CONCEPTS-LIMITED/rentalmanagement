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

            // Run overdue check immediately on startup so stale invoices are fixed without waiting an hour.
            try { await MarkOverdueInvoicesAsync(); }
            catch (Exception ex) { _logger.LogError(ex, "Initial overdue check failed."); }

            // Check once per hour: generate monthly invoices + mark overdue invoices.
            using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await GenerateMonthlyInvoicesAsync();
                    await MarkOverdueInvoicesAsync();
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

        /// <summary>
        /// Finds every Pending invoice whose DueDate has passed and promotes it to Overdue.
        /// Sends an SMS reminder to the tenant.
        /// </summary>
        private async Task MarkOverdueInvoicesAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var db  = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var sms = scope.ServiceProvider.GetRequiredService<ISmsProcessor>();

            var now = DateTime.UtcNow;

            var overdueInvoices = await db.TenantInvoices
                .Include(i => i.Tenant)
                .Where(i => i.Status == "Pending" && i.DueDate < now)
                .ToListAsync();

            if (overdueInvoices.Count == 0) return;

            foreach (var inv in overdueInvoices)
            {
                inv.Status    = "Overdue";
                inv.UpdatedAt = now;

                // SMS notification
                var phone = inv.Tenant?.PhoneNumber;
                if (!string.IsNullOrWhiteSpace(phone))
                {
                    var name = inv.Tenant!.FullName;
                    var msg  = $"Dear {name}, invoice {inv.InvoiceNumber} of UGX {inv.Amount:N0} " +
                               $"was due on {inv.DueDate:dd MMM yyyy} and is now OVERDUE. " +
                               $"Please settle your balance immediately to avoid further action.";
                    try { await sms.SendAsync(phone, msg); }
                    catch (Exception ex) { _logger.LogWarning(ex, "SMS failed for overdue invoice {No}", inv.InvoiceNumber); }
                }
            }

            await db.SaveChangesAsync();
            _logger.LogInformation("MarkOverdue: {Count} invoice(s) promoted to Overdue.", overdueInvoices.Count);
        }

        private async Task GenerateMonthlyInvoicesAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var invoiceSvc = scope.ServiceProvider.GetRequiredService<ITenantInvoiceService>();
            var sms = scope.ServiceProvider.GetRequiredService<ISmsProcessor>();

            var today = DateTime.Now; // use server local time so day-of-month matches landlord's timezone
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

            // Load per-tenant invoice day overrides
            var tenantIds = contracts.Where(c => c.TenantId.HasValue).Select(c => c.TenantId!.Value).Distinct().ToList();
            var tenantOverrides = await db.Tenants
                .AsNoTracking()
                .Where(t => tenantIds.Contains(t.Id) && t.InvoiceGenerationDay != null)
                .Select(t => new { t.Id, t.InvoiceGenerationDay })
                .ToDictionaryAsync(t => t.Id);

            // Track generated amounts per landlord so we can send one SMS summary per landlord
            var landlordSummary = new Dictionary<int, (int Count, double Total)>();

            int created = 0;
            foreach (var contract in contracts)
            {
                // Per-tenant override takes priority → landlord setting → global config
                var tenantOverride = contract.TenantId.HasValue && tenantOverrides.TryGetValue(contract.TenantId.Value, out var to) ? to : null;
                var landlord = landlordSettings.TryGetValue(contract.OwnerId, out var ls) ? ls : null;
                var generationDay = tenantOverride?.InvoiceGenerationDay
                    ?? landlord?.InvoiceGenerationDay
                    ?? _config.GetValue<int>("InvoiceScheduler:GenerationDayOfMonth", 1);
                var dueDays = landlord?.InvoiceDueDays ?? globalDueDays;

                // Only generate on the resolved day-of-month
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

                    created++;
                    if (!landlordSummary.ContainsKey(contract.OwnerId))
                        landlordSummary[contract.OwnerId] = (0, 0);
                    var prev = landlordSummary[contract.OwnerId];
                    landlordSummary[contract.OwnerId] = (prev.Count + 1, prev.Total + contract.RentAmount);

                    _logger.LogInformation("Created invoice {InvoiceNo} for tenant {TenantId}", invoice.InvoiceNumber, contract.TenantId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to create invoice for contract {ContractId}", contract.Id);
                }
            }

            // Notify each landlord by SMS with a one-line summary
            if (landlordSummary.Count > 0)
            {
                var landlordPhones = await db.Users
                    .AsNoTracking()
                    .Where(u => landlordSummary.Keys.Contains(u.Id) && u.PhoneNumber != null && u.PhoneNumber != "")
                    .Select(u => new { u.Id, u.FullName, u.PhoneNumber })
                    .ToListAsync();

                foreach (var landlord in landlordPhones)
                {
                    var (count, total) = landlordSummary[landlord.Id];
                    var msg = $"Hi {landlord.FullName}, {count} rent invoice(s) have been auto-generated for {today:MMMM yyyy}. " +
                              $"Total: UGX {total:N0}. " +
                              $"Log in to your dashboard to review them.";
                    try { await sms.SendAsync(landlord.PhoneNumber!, msg); }
                    catch (Exception ex) { _logger.LogWarning(ex, "SMS notification failed for landlord {Id}", landlord.Id); }
                }
            }

            _logger.LogInformation("InvoiceScheduler: {Count} invoice(s) generated for {Month}", created, today.ToString("MMMM yyyy"));
        }
    }
}
