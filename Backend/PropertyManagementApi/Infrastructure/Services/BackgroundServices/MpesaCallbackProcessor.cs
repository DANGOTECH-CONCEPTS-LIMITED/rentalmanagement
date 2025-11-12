using System;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Infrastructure.Data;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
using Domain.Dtos.External;
using Domain.Entities.External;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.BackgroundServices
{
 public class MpesaCallbackProcessor : BackgroundService
 {
 private readonly IServiceProvider _provider;
 private readonly ILogger<MpesaCallbackProcessor> _logger;
 private readonly TimeSpan _delay = TimeSpan.FromSeconds(10);

 public MpesaCallbackProcessor(IServiceProvider provider, ILogger<MpesaCallbackProcessor> logger)
 {
 _provider = provider;
 _logger = logger;
 }

 protected override async Task ExecuteAsync(CancellationToken stoppingToken)
 {
 _logger.LogInformation("MpesaCallbackProcessor started.");

 while (!stoppingToken.IsCancellationRequested)
 {
 try
 {
 await ProcessPendingAsync(stoppingToken);
 }
 catch (Exception ex)
 {
 _logger.LogError(ex, "Error in MpesaCallbackProcessor loop");
 }

 await Task.Delay(_delay, stoppingToken);
 }

 _logger.LogInformation("MpesaCallbackProcessor stopping.");
 }

 private async Task ProcessPendingAsync(CancellationToken ct)
 {
 using var scope = _provider.CreateScope();
 var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
 var walletSvc = scope.ServiceProvider.GetRequiredService<IWalletService>();
 var paymentSvc = scope.ServiceProvider.GetRequiredService<IPaymentService>();

 var audits = await db.MpesaCallbackAudits
 .Where(a => !a.Processed)
 .OrderBy(a => a.ReceivedAt)
 .Take(50)
 .ToListAsync(ct);

 foreach (var audit in audits)
 {
 try
 {
 MpesaCallbackDto? dto = null;
 try
 {
 dto = JsonSerializer.Deserialize<MpesaCallbackDto>(audit.Payload ?? string.Empty);
 }
 catch (Exception jex)
 {
 _logger.LogWarning(jex, "Failed to deserialize audit payload Id={Id}", audit.Id);
 }

 // Try to map to a UtilityPayment first
 if (dto != null && !string.IsNullOrWhiteSpace(dto.TransID))
 {
 var transId = dto.TransID;

 var util = await db.UtilityPayments.FirstOrDefaultAsync(u => u.TransactionID == transId, ct);
 if (util != null)
 {
 util.Status = "SUCCESSFUL";
 util.ReasonAtTelecom = "Callback received";
 util.VendorTranId = dto.ThirdPartyTransID ?? dto.TransID;
 util.Vendor = dto.FirstName;
 util.VendorPaymentDate = DateTime.UtcNow;
 db.UtilityPayments.Update(util);

 // Try to credit wallet: find wallet by meter -> landlord -> wallet
 try
 {
 var wallet = await walletSvc.GetWalletByUtilityMeterNumber(util.MeterNumber);
 if (wallet != null)
 {
 var txn = new Domain.Entities.PropertyMgt.WalletTransaction
 {
 WalletId = wallet.Id,
 Amount = (decimal)util.Amount, // cast to decimal
 Description = util.Description,
 TransactionDate = DateTime.UtcNow,
 TransactionId = util.TransactionID,
 Status = "SUCCESSFUL",
 };
 await walletSvc.AddWalletTransaction(txn);
 }
 }
 catch (Exception wx)
 {
 _logger.LogWarning(wx, "Failed to credit wallet for UtilityPayment {Tran}", util.TransactionID);
 }

 audit.Processed = true;
 db.MpesaCallbackAudits.Update(audit);
 await db.SaveChangesAsync(ct);
 continue;
 }

 // Try TenantPayment by TransactionId
 var tenant = await db.TenantPayments.FirstOrDefaultAsync(t => t.TransactionId == transId, ct);
 if (tenant != null)
 {
 tenant.PaymentStatus = "SUCCESSFUL";
 tenant.ReasonAtTelecom = "Callback received";
 db.TenantPayments.Update(tenant);
 audit.Processed = true;
 db.MpesaCallbackAudits.Update(audit);
 await db.SaveChangesAsync(ct);
 continue;
 }
 }

 // If can't map, mark processed to avoid endless retries, but log
 audit.Processed = true;
 db.MpesaCallbackAudits.Update(audit);
 await db.SaveChangesAsync(ct);
 _logger.LogInformation("Marked audit {Id} processed without mapping", audit.Id);
 }
 catch (Exception ex)
 {
 _logger.LogError(ex, "Failed to process audit {Id}", audit.Id);
 // do not mark processed so it can be retried
 }
 }
 }
 }
}
