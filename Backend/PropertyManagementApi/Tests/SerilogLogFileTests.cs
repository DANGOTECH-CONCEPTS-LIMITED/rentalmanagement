using API.Controllers.Settings;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using System.Text.Json;

namespace Tests;

public class SerilogLogFileTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), $"api-logs-{Guid.NewGuid():N}");
    private readonly string _logsDirectory;

    public SerilogLogFileTests()
    {
        _logsDirectory = Path.Combine(_root, "logs");
        Directory.CreateDirectory(_logsDirectory);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* best effort */ }
    }

    private SettingsController Controller() => new(null!, new FakeEnvironment(_root), null!);

    [Fact]
    public async Task ActiveLogFileCanBeReadWhileTheLoggerStillHoldsItOpen()
    {
        var path = Path.Combine(_logsDirectory, "log-20261106.txt");
        await File.WriteAllTextAsync(path,
            "2026-11-06 10:00:00 [INF] POST /api/Stanbic/bill-payment-status x-api-key: abc123\n" +
            "2026-11-06 10:00:01 [INF] second line\n");

        // Serilog.Sinks.File keeps the active file open for writing with FileShare.Read, which makes
        // a plain File.ReadAllText throw "The process cannot access the file...".
        await using var writer = new FileStream(path, FileMode.Append, FileAccess.Write, FileShare.Read);

        var result = await Controller().GetSerilogLogFileContent("log-20261106.txt", CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = JsonSerializer.Serialize(ok.Value);
        Assert.Contains("second line", json);
        Assert.Contains("***MASKED***", json);
        Assert.DoesNotContain("abc123", json);
    }

    [Fact]
    public async Task MissingOrTraversalFileNamesReturnNotFound()
    {
        var controller = Controller();
        Assert.IsType<NotFoundObjectResult>(await controller.GetSerilogLogFileContent("../../appsettings.json", CancellationToken.None));
        Assert.IsType<NotFoundObjectResult>(await controller.GetSerilogLogFileContent("does-not-exist.txt", CancellationToken.None));
        Assert.IsType<BadRequestObjectResult>(await controller.GetSerilogLogFileContent("  ", CancellationToken.None));
    }

    private sealed class FakeEnvironment(string root) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = root;
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = root;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
