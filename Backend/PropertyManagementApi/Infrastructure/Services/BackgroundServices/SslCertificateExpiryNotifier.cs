using Infrastructure.Services.Email;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Globalization;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Infrastructure.Services.BackgroundServices
{
    /// <summary>
    /// Checks the Stanbic signing certificate on a schedule and emails a reminder when it is within
    /// the notification window of expiry (or already expired). The certificate can be read from a
    /// local file or fetched from a remote endpoint (e.g. the DangoApi). A marker file prevents
    /// duplicate emails for the same certificate.
    /// </summary>
    public class SslCertificateExpiryNotifier : BackgroundService
    {
        private static readonly HttpClient Http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };

        private readonly ILogger<SslCertificateExpiryNotifier> _logger;
        private readonly IEmailService _email;
        private readonly string _certPath;
        private readonly string _sourceUrl;
        private readonly string _notifyEmail;
        private readonly string _markerPath;
        private readonly int _notifyDaysBefore;
        private readonly int _escalateDailyDays;
        private readonly TimeSpan _interval;

        public SslCertificateExpiryNotifier(
            ILogger<SslCertificateExpiryNotifier> logger,
            IEmailService email,
            IConfiguration configuration,
            IHostEnvironment environment)
        {
            _logger = logger;
            _email = email;
            _certPath = configuration["SslCertificate:Path"] ?? string.Empty;
            _sourceUrl = configuration["SslCertificate:SourceUrl"] ?? string.Empty;
            _notifyEmail = configuration["SslCertificate:NotifyEmail"] ?? "ngobidaniel04@gmail.com";
            _notifyDaysBefore = configuration.GetValue("SslCertificate:NotifyDaysBefore", 7);
            _escalateDailyDays = configuration.GetValue("SslCertificate:EscalateDailyDays", 4);
            var intervalHours = configuration.GetValue("SslCertificate:IntervalHours", 24);
            _interval = TimeSpan.FromHours(intervalHours);

            var markerFile = configuration["SslCertificate:MarkerFile"];
            _markerPath = string.IsNullOrWhiteSpace(markerFile)
                ? Path.Combine(environment.ContentRootPath, "logs", "ssl-expiry-notified.txt")
                : markerFile;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (string.IsNullOrWhiteSpace(_sourceUrl) && string.IsNullOrWhiteSpace(_certPath))
            {
                _logger.LogWarning("SslCertificateExpiryNotifier is disabled: neither SslCertificate:SourceUrl nor SslCertificate:Path is configured.");
                return;
            }

            _logger.LogInformation("SslCertificateExpiryNotifier started; interval {Interval}, source {Source}.",
                _interval, string.IsNullOrWhiteSpace(_sourceUrl) ? _certPath : _sourceUrl);

            using var timer = new PeriodicTimer(_interval);
            try
            {
                do
                {
                    try
                    {
                        await CheckOnceAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error checking SSL certificate expiry.");
                    }
                }
                while (await timer.WaitForNextTickAsync(stoppingToken));
            }
            catch (OperationCanceledException)
            {
                // Normal shutdown.
            }
        }

        private async Task CheckOnceAsync()
        {
            var loaded = await LoadCertificateAsync();
            if (loaded == null)
            {
                return;
            }

            var (info, source) = loaded.Value;
            var daysLeft = (info.NotAfter - DateTime.UtcNow).TotalDays;
            _logger.LogInformation("SSL certificate '{Subject}' expires {NotAfter:yyyy-MM-dd HH:mm} ({DaysLeft:0.#} days left).",
                info.Subject, info.NotAfter, daysLeft);

            if (daysLeft > _notifyDaysBefore)
            {
                return; // Not in the notification window yet.
            }

            var now = DateTime.UtcNow;
            var expiryKey = info.NotAfter.ToString("O", CultureInfo.InvariantCulture);
            var today = now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var marker = ReadMarker();
            var isNewCertificate = !string.Equals(marker.NotAfter, expiryKey, StringComparison.Ordinal);

            // First notification the moment the certificate enters the window; then escalate to a
            // daily reminder once within EscalateDailyDays, continuing until the cert is renewed.
            bool shouldNotify;
            if (isNewCertificate)
            {
                shouldNotify = true;
            }
            else if (daysLeft <= _escalateDailyDays)
            {
                shouldNotify = !string.Equals(marker.LastNotifiedDay, today, StringComparison.Ordinal);
            }
            else
            {
                shouldNotify = false; // between the first notice and the daily window
            }

            if (!shouldNotify)
            {
                return;
            }

            var subject = daysLeft < 0
                ? $"SSL certificate EXPIRED on {info.NotAfter:yyyy-MM-dd}"
                : $"SSL certificate expires in {Math.Max(1, (int)Math.Ceiling(daysLeft))} day(s)";
            var body = BuildBody(info, source, daysLeft);
            await _email.SendEmailAsync(_notifyEmail, subject, body);

            WriteMarker(expiryKey, today);
            _logger.LogInformation("SSL certificate expiry notification sent to {Email}.", _notifyEmail);
        }

        private async Task<(CertificateInfo Info, string Source)?> LoadCertificateAsync()
        {
            if (!string.IsNullOrWhiteSpace(_sourceUrl))
            {
                var info = await LoadFromHttpAsync(_sourceUrl);
                return info == null ? null : (info, _sourceUrl);
            }

            if (!File.Exists(_certPath))
            {
                _logger.LogError("SSL certificate file not found at {Path}", _certPath);
                return null;
            }

            using var cert = new X509Certificate2(_certPath);
            return (new CertificateInfo(cert.Subject, cert.Issuer, cert.NotBefore, cert.NotAfter.ToUniversalTime()), _certPath);
        }

        private async Task<CertificateInfo?> LoadFromHttpAsync(string url)
        {
            try
            {
                var json = await Http.GetStringAsync(url);

                using var document = JsonDocument.Parse(json);
                var root = document.RootElement;
                if (!root.TryGetProperty("notAfter", out var notAfterElement) ||
                    !notAfterElement.TryGetDateTime(out var notAfter))
                {
                    _logger.LogError("Certificate endpoint returned no valid notAfter: {Url}", url);
                    return null;
                }

                var subject = root.TryGetProperty("subject", out var subjectElement) ? subjectElement.GetString() ?? string.Empty : string.Empty;
                var issuer = root.TryGetProperty("issuer", out var issuerElement) ? issuerElement.GetString() ?? string.Empty : string.Empty;
                return new CertificateInfo(subject, issuer, DateTime.MinValue, notAfter.ToUniversalTime());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch certificate expiry from {Url}", url);
                return null;
            }
        }

        private string BuildBody(CertificateInfo info, string source, double daysLeft)
        {
            var state = daysLeft < 0
                ? "has <b>expired</b>"
                : $"expires in <b>{Math.Max(1, (int)Math.Ceiling(daysLeft))} day(s)</b>";
            var validFrom = info.NotBefore == DateTime.MinValue
                ? "n/a"
                : info.NotBefore.ToString("yyyy-MM-dd HH:mm");
            var expires = info.NotAfter.ToString("yyyy-MM-dd HH:mm");

            return "<p>The SSL certificate used for DangoPay signing / web server " + state + ".</p>"
                + "<ul>"
                + "<li><b>Subject:</b> " + info.Subject + "</li>"
                + "<li><b>Issuer:</b> " + info.Issuer + "</li>"
                + "<li><b>Valid from:</b> " + validFrom + "</li>"
                + "<li><b>Expires:</b> " + expires + "</li>"
                + "<li><b>Source:</b> " + source + "</li>"
                + "</ul>"
                + "<p>Renew it before expiry. If the private key changes, update <code>Stanbic:CertificatePath</code> and re-register the new public key with Stanbic to avoid 401 signature errors.</p>";
        }

        private MarkerState ReadMarker()
        {
            try
            {
                if (!File.Exists(_markerPath)) return new MarkerState();
                var json = File.ReadAllText(_markerPath);
                return JsonSerializer.Deserialize<MarkerState>(json) ?? new MarkerState();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to read the SSL expiry marker file.");
                return new MarkerState();
            }
        }

        private void WriteMarker(string notAfter, string lastNotifiedDay)
        {
            try
            {
                var directory = Path.GetDirectoryName(_markerPath);
                if (!string.IsNullOrEmpty(directory))
                    Directory.CreateDirectory(directory);
                var json = JsonSerializer.Serialize(new MarkerState
                {
                    NotAfter = notAfter,
                    LastNotifiedDay = lastNotifiedDay
                });
                File.WriteAllText(_markerPath, json);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to write the SSL expiry marker file.");
            }
        }

        private sealed record CertificateInfo(string Subject, string Issuer, DateTime NotBefore, DateTime NotAfter);

        private sealed class MarkerState
        {
            public string NotAfter { get; set; } = string.Empty;
            public string LastNotifiedDay { get; set; } = string.Empty;
        }
    }
}

