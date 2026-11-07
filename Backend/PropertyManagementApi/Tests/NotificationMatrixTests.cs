using Application.Interfaces.Notifications;
using Application.Interfaces.SMS;
using Domain.Entities.External;
using Domain.Entities.Notifications;
using Domain.Notifications;
using Infrastructure.Data;
using Infrastructure.Services.Email;
using Infrastructure.Services.Notifications;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Tests;

public class NotificationMatrixTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=notify-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;
    private RecordingEmail _email = null!;
    private RecordingSms _sms = null!;
    private NotificationSettingsService _settings = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
        _email = new RecordingEmail();
        _sms = new RecordingSms();
        _settings = new NotificationSettingsService(_db);
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    private NotificationDispatcher Dispatcher(IEmailService? email = null, ISmsProcessor? sms = null) =>
        new(_db, email ?? _email, sms ?? _sms, NullLogger<NotificationDispatcher>.Instance);

    private async Task<List<NotificationDelivery>> DeliveriesAsync() =>
        await _db.NotificationDeliveries.AsNoTracking().OrderBy(x => x.Id).ToListAsync();

    [Fact]
    public async Task MatrixExposesEveryEventWithItsDefaultChannels()
    {
        var matrix = await _settings.GetMatrixAsync();

        foreach (var definition in NotificationCatalog.All)
        {
            foreach (var channel in definition.DefaultChannels)
            {
                Assert.Contains(matrix, row => row.EventType == definition.Key && row.Channel == channel);
            }
        }

        var failed = matrix.Single(x => x.EventType == NotificationEvents.BillPaymentFailed && x.Channel == NotificationChannels.Email);
        Assert.True(failed.IsEnabled);
        Assert.Equal(NotificationCatalog.DefaultAdminRecipients, failed.Recipients);
        Assert.True(failed.IsOperationsAlert);
    }

    [Fact]
    public async Task OperationsAlertsReachTheConfiguredAdminWithoutAnySavedRow()
    {
        await Dispatcher().DispatchAsync(new NotificationRequest(
            NotificationEvents.BillPaymentFailed, "Bill failed", "<p>Reference DANGO_B_1</p>", "DANGO_B_1"));

        var sent = Assert.Single(_email.Sent);
        Assert.Equal(NotificationCatalog.DefaultAdminRecipients, sent.To);
        Assert.Equal("Bill failed", sent.Subject);

        // Email copy plus the in-app copy administrators see in the log.
        var deliveries = await DeliveriesAsync();
        Assert.Equal(2, deliveries.Count);
        var emailDelivery = Assert.Single(deliveries, x => x.Channel == NotificationChannels.Email);
        Assert.Equal(NotificationDeliveryStatus.Sent, emailDelivery.Status);
        Assert.Equal("DANGO_B_1", emailDelivery.Reference);
        Assert.Equal(NotificationDeliveryStatus.Sent, Assert.Single(deliveries, x => x.Channel == NotificationChannels.InApp).Status);
    }

    [Fact]
    public async Task UsingTheLastKnownAddressNoLongerSendsTwoCopies()
    {
        // Saving a single recipient must replace the default, not add to it.
        await _settings.SaveAsync([
            new NotificationMatrixRow(NotificationEvents.BillPaymentFailed, "", "", NotificationChannels.Email, true, "ops@test;finance@test", null, true)
        ], "admin");

        await Dispatcher().DispatchAsync(new NotificationRequest(NotificationEvents.BillPaymentFailed, "Bill failed", "body"));

        Assert.Equal(["ops@test", "finance@test"], _email.Sent.Select(x => x.To));
        Assert.Equal(2, (await DeliveriesAsync()).Count(x => x.Channel == NotificationChannels.Email));
    }

    [Fact]
    public async Task DisabledChannelIsNotSentButOthersStillAre()
    {
        await _settings.SaveAsync([
            new NotificationMatrixRow(NotificationEvents.BillPaymentFailed, "", "", NotificationChannels.Email, false, "ops@test", null, true)
        ], "admin");

        await Dispatcher().DispatchAsync(new NotificationRequest(NotificationEvents.BillPaymentFailed, "Bill failed", "body"));

        Assert.Empty(_email.Sent);
        var delivery = Assert.Single(await DeliveriesAsync());
        Assert.Equal(NotificationChannels.InApp, delivery.Channel);
        Assert.Equal(NotificationDeliveryStatus.Sent, delivery.Status);
    }

    [Fact]
    public async Task RequestAddressIsUsedWhenTheMatrixHasNone()
    {
        await Dispatcher().DispatchAsync(new NotificationRequest(
            NotificationEvents.PaymentReceived, "Receipt", "Payment received", SmsTo: "256770000001"));

        var sms = Assert.Single(_sms.Sent);
        Assert.Equal("256770000001", sms.Phone);
        Assert.Equal("Payment received", sms.Message);
    }

    [Fact]
    public async Task HtmlBodyIsFlattenedForSms()
    {
        await Dispatcher().DispatchAsync(new NotificationRequest(
            NotificationEvents.RentDue, "Rent due", "<p>Hello Jane,</p><p>Rent is due on 2026-12-01.</p>", SmsTo: "256770000002"));

        var sms = Assert.Single(_sms.Sent);
        Assert.DoesNotContain("<p>", sms.Message);
        Assert.Contains("Rent is due on 2026-12-01.", sms.Message);
    }

    [Fact]
    public async Task TransportFailureIsLoggedAndNeverThrows()
    {
        await Dispatcher(email: new ThrowingEmail()).DispatchAsync(
            new NotificationRequest(NotificationEvents.BillPaymentUndebited, "Wallet not debited", "body", "DANGO_B_9"));

        var delivery = Assert.Single(await DeliveriesAsync(), x => x.Channel == NotificationChannels.Email);
        Assert.Equal(NotificationDeliveryStatus.Failed, delivery.Status);
        Assert.Contains("smtp down", delivery.Error);
    }

    [Fact]
    public async Task EnabledChannelWithoutARecipientIsSkippedNotSilent()
    {
        await _settings.SaveAsync([
            new NotificationMatrixRow(NotificationEvents.BillPaymentFailed, "", "", NotificationChannels.Email, true, null, null, true)
        ], "admin");

        await Dispatcher().DispatchAsync(new NotificationRequest(NotificationEvents.BillPaymentFailed, "Bill failed", "body"));

        Assert.Empty(_email.Sent);
        var skipped = Assert.Single(await DeliveriesAsync(), x => x.Channel == NotificationChannels.Email);
        Assert.Equal(NotificationDeliveryStatus.Skipped, skipped.Status);
        Assert.Contains("No recipient", skipped.Error);
    }

    [Fact]
    public async Task SavingRejectsBadRecipientsAndUnknownEvents()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _settings.SaveAsync([
            new NotificationMatrixRow(NotificationEvents.BillPaymentFailed, "", "", NotificationChannels.Email, true, "not-an-email", null, true)
        ], "admin"));

        await Assert.ThrowsAsync<ArgumentException>(() => _settings.SaveAsync([
            new NotificationMatrixRow("made_up_event", "", "", NotificationChannels.Email, true, "ops@test", null, false)
        ], "admin"));

        await Assert.ThrowsAsync<ArgumentException>(() => _settings.SaveAsync([
            new NotificationMatrixRow(NotificationEvents.BillPaymentFailed, "", "", "Carrier_Pigeon", true, null, null, true)
        ], "admin"));
    }

    [Fact]
    public async Task SavingUpdatesInPlaceInsteadOfDuplicatingCells()
    {
        var row = new NotificationMatrixRow(NotificationEvents.ContractExpiring, "", "", NotificationChannels.Sms, true, "256770000003", "Landlord", true);
        await _settings.SaveAsync([row], "admin");
        await _settings.SaveAsync([row with { IsEnabled = false }], "admin2");

        var stored = Assert.Single(await _db.NotificationSettings.AsNoTracking().ToListAsync());
        Assert.False(stored.IsEnabled);
        Assert.Equal("admin2", stored.UpdatedBy);
        Assert.Equal("256770000003", stored.Recipients);
    }

    [Fact]
    public async Task DeliveryLogIsFilterableAndPaged()
    {
        var dispatcher = Dispatcher();
        await dispatcher.DispatchAsync(new NotificationRequest(NotificationEvents.BillPaymentFailed, "a", "body"));
        await dispatcher.DispatchAsync(new NotificationRequest(NotificationEvents.RentDue, "b", "body", SmsTo: "256770000001"));
        await dispatcher.DispatchAsync(new NotificationRequest(NotificationEvents.BillPaymentFailed, "c", "body"));

        var all = await _settings.GetDeliveriesAsync(null, null, 1, 50);
        Assert.Equal(6, all.Total); // 2 bill emails + 2 in-app copies + 1 SMS + 1 skipped email

        var onlyBills = await _settings.GetDeliveriesAsync(NotificationEvents.BillPaymentFailed, null, 1, 50);
        Assert.All(onlyBills.Items, x => Assert.Equal(NotificationEvents.BillPaymentFailed, x.EventType));

        var page = await _settings.GetDeliveriesAsync(null, null, 2, 2);
        Assert.Equal(2, page.Items.Count);
        Assert.Equal(6, page.Total);
    }

    public sealed class RecordingEmail : IEmailService
    {
        public List<(string To, string Subject, string Message)> Sent { get; } = [];
        public Task SendEmailAsync(string toEmail, string subject, string message)
        {
            Sent.Add((toEmail, subject, message));
            return Task.CompletedTask;
        }
    }

    public sealed class ThrowingEmail : IEmailService
    {
        public Task SendEmailAsync(string toEmail, string subject, string message)
            => throw new InvalidOperationException("smtp down");
    }

    public sealed class RecordingSms : ISmsProcessor
    {
        public List<(string Phone, string Message)> Sent { get; } = [];
        public Task<bool> SendAsync(string phoneNumber, string message)
        {
            Sent.Add((phoneNumber, message));
            return Task.FromResult(true);
        }
        public Task<bool> SendAfricaTalkingSms(AfricasTalkingSmsRequest request) => Task.FromResult(true);
    }
}
