using Application.Interfaces.Meter;
using Application.Interfaces.PrepaidApi;
using Domain.Dtos.PrepaidApi;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Infrastructure.Services.Meter
{
    public class MeterTokenService : IMeterTokenService
    {
        private readonly AppDbContext _context;
        private readonly IPrepaidApiClient _prepaidApiClient;
        private readonly ILogger<MeterTokenService> _logger;

        public MeterTokenService(AppDbContext context, IPrepaidApiClient prepaidApiClient, ILogger<MeterTokenService> logger)
        {
            _context = context;
            _prepaidApiClient = prepaidApiClient;
            _logger = logger;
        }

        public async Task GenerateTokensForAllMetersAsync(decimal amount)
        {
            var meters = await _context.UtilityMeters.ToListAsync();
            foreach (var meter in meters)
            {
                try
                {
                    var purchaseDto = new PurchasePreviewDto
                    {
                        MeterNumber = meter.MeterNumber,
                        Amount = amount
                    };

                    var purchaseResult = await _prepaidApiClient.PurchaseAsync(purchaseDto);

                    if (purchaseResult.Result != null)
                    {
                        var meterToken = new MeterToken
                        {
                            MeterNumber = meter.MeterNumber,
                            Amount = amount,
                            MeterName = meter.MeterNumber, // Or get name if available
                            Units = (int)purchaseResult.Result.TotalUnit,
                            Token = purchaseResult.Result.Token
                        };

                        _context.MeterTokens.Add(meterToken);
                        await _context.SaveChangesAsync();

                        _logger.LogInformation($"Token generated for meter {meter.MeterNumber}: {purchaseResult.Result.Token}");
                    }
                    else
                    {
                        _logger.LogWarning($"No result for meter {meter.MeterNumber}");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Failed to generate token for meter {meter.MeterNumber}");
                }
            }
        }
    }
}