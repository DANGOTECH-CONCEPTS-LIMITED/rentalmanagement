using System.Threading.Channels;
using Application.Interfaces.SMS;
using Application.Interfaces.Tenant;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Tenant;

public sealed class InvoiceSmsQueue : BackgroundService, IInvoiceSmsQueue
{
    private readonly Channel<InvoiceSmsMessage> _messages = Channel.CreateBounded<InvoiceSmsMessage>(
        new BoundedChannelOptions(100)
        {
            SingleReader = true,
            FullMode = BoundedChannelFullMode.Wait,
        });

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<InvoiceSmsQueue> _logger;

    public InvoiceSmsQueue(IServiceScopeFactory scopeFactory, ILogger<InvoiceSmsQueue> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public bool TryQueue(string phoneNumber, string message, string invoiceNumber)
    {
        return _messages.Writer.TryWrite(new InvoiceSmsMessage(phoneNumber, message, invoiceNumber));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var message in _messages.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var smsProcessor = scope.ServiceProvider.GetRequiredService<ISmsProcessor>();
                await smsProcessor.SendAsync(message.PhoneNumber, message.Message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Invoice SMS notification failed for invoice {InvoiceNumber}", message.InvoiceNumber);
            }
        }
    }

    private sealed record InvoiceSmsMessage(string PhoneNumber, string Message, string InvoiceNumber);
}