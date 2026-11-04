using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.SMS;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BackgroundServices
{
    /// <summary>
    /// Sends daily SMS/email reminders for upcoming rent, overdue balances and expiring leases.
    /// Disabled by default; enable with Reminders:Enabled=true.
    /// </summary>
    public class ReminderProcessor : BackgroundService
    {
        private readonly ILogger<ReminderProcessor> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _configuration;
        private readonly bool _enabled;
        private readonly int _dueDays;
        private readonly int _leaseExpiryDays;
        private readonly TimeSpan _pollInterval;

        public ReminderProcessor(
            ILogger<ReminderProcessor> logger,
            IServiceScopeFactory scopeFactory,
            IConfiguration configuration)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
            _configuration = configuration;
            _enabled = configuration.GetValue<bool>("Reminders:Enabled");
            _dueDays = configuration.GetValue<int>("Reminders:DueDays", 3);
            _leaseExpiryDays = configuration.GetValue<int>("Reminders:LeaseExpiryDays", 30);
            var intervalHours = configuration.GetValue<int>("Reminders:IntervalHours", 24);
            _pollInterval = TimeSpan.FromHours(intervalHours);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_enabled)
            {
                _logger.LogInformation("ReminderProcessor is disabled (Reminders:Enabled is false).");
                return;
            }

            _logger.LogInformation("ReminderProcessor started; interval {Interval}.", _pollInterval);
            using var timer = new PeriodicTimer(_pollInterval);
            try
            {
                do
                {
                    try
                    {
                        await ProcessRemindersAsync(stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Reminder processing failed.");
                    }
                }
                while (await timer.WaitForNextTickAsync(stoppingToken));
            }
            catch (OperationCanceledException)
            {
                // Normal shutdown.
            }
            _logger.LogInformation("ReminderProcessor stopped.");
        }

        private async Task ProcessRemindersAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var sms = scope.ServiceProvider.GetRequiredService<ISmsProcessor>();
            var email = scope.ServiceProvider.GetRequiredService<IEmailService>();
            var today = DateTime.UtcNow.Date;
            var dueCutoff = today.AddDays(_dueDays);
            var leaseCutoff = today.AddDays(_leaseExpiryDays);

            // 1) Rent due within the configured window.
            var dueSoon = await db.Tenants.AsNoTracking()
                .Where(t => t.Active && t.NextPaymentDate.Date >= today && t.NextPaymentDate.Date <= dueCutoff)
                .Include(t => t.Property)
                .ToListAsync(ct);

            foreach (var tenant in dueSoon)
            {
                var message = $"Hello {tenant.FullName}, your rent for {tenant.Property?.Name ?? "your property"} is due on {tenant.NextPaymentDate:yyyy-MM-dd}. Please make payment on time.";
                await TrySendSmsAsync(sms, tenant.PhoneNumber, message, "rent due");
            }

            // 2) Overdue balances.
            var overdue = await db.Tenants.AsNoTracking()
                .Where(t => t.Active && (t.Arrears > 0 || t.BalanceDue > 0))
                .Include(t => t.Property)
                .ToListAsync(ct);

            foreach (var tenant in overdue)
            {
                var message = $"Hello {tenant.FullName}, you have an outstanding balance of {(tenant.Arrears + tenant.BalanceDue):N0} for {tenant.Property?.Name ?? "your property"}. Please clear it to avoid penalties.";
                await TrySendSmsAsync(sms, tenant.PhoneNumber, message, "overdue balance");
            }

            // 3) Leases expiring within the configured window.
            var expiring = await db.RentalContracts.AsNoTracking()
                .Where(c => c.Status == "ACTIVE" && c.EndDate.Date >= today && c.EndDate.Date <= leaseCutoff)
                .Include(c => c.Tenant)
                .Include(c => c.Property)
                    .ThenInclude(p => p.Owner)
                .ToListAsync(ct);

            foreach (var contract in expiring)
            {
                if (contract.Tenant is { } tenant)
                {
                    var message = $"Hello {tenant.FullName}, your lease for {contract.Property?.Name ?? "your property"} ends on {contract.EndDate:yyyy-MM-dd}. Contact your landlord to renew.";
                    await TrySendSmsAsync(sms, tenant.PhoneNumber, message, "lease expiry");
                }
                if (contract.Property?.Owner is { } owner && !string.IsNullOrWhiteSpace(owner.Email))
                {
                    try
                    {
                        await email.SendEmailAsync(owner.Email,
                            "Lease expiring soon",
                            $"The lease for {contract.Property.Name} (tenant {contract.Tenant?.FullName}) ends on {contract.EndDate:yyyy-MM-dd}.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Could not email landlord {LandlordId} about lease expiry.", owner.Id);
                    }
                }
            }

            _logger.LogInformation("Reminders processed: {DueSoon} due, {Overdue} overdue, {Expiring} leases expiring.",
                dueSoon.Count, overdue.Count, expiring.Count);
        }

        private async Task TrySendSmsAsync(ISmsProcessor sms, string phoneNumber, string message, string kind)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(phoneNumber)) return;
                var sent = await sms.SendAsync(phoneNumber, message);
                if (!sent) _logger.LogWarning("SMS ({Kind}) to {Phone} failed.", kind, phoneNumber);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error sending SMS ({Kind}) to {Phone}.", kind, phoneNumber);
            }
        }
    }
}
