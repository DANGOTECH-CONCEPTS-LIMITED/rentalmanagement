using Application.Interfaces.Meter;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Infrastructure.Services.BackgroundServices
{
    public class MeterTokenGeneratorService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<MeterTokenGeneratorService> _logger;

        public MeterTokenGeneratorService(IServiceScopeFactory scopeFactory, ILogger<MeterTokenGeneratorService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("MeterTokenGeneratorService started.");

            // For now, it's a one-time service or can be triggered externally.
            // If needed, add logic to poll for requests.
            await Task.CompletedTask;
        }

        // Method to trigger token generation
        public async Task GenerateTokensAsync(decimal amount)
        {
            using var scope = _scopeFactory.CreateScope();
            var meterTokenService = scope.ServiceProvider.GetRequiredService<IMeterTokenService>();

            _logger.LogInformation($"Starting token generation for amount {amount}");
            await meterTokenService.GenerateTokensForAllMetersAsync(amount);
            _logger.LogInformation("Token generation completed.");
        }
    }
}