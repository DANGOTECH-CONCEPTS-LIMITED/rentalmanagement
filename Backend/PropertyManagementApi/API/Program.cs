using Application.Interfaces.Collecto;
using Application.Interfaces.Stanbic;
using System.Threading.RateLimiting;
using Infrastructure.Services.Stanbic;
using Application.Interfaces.Complaints;
using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
using Application.Interfaces.PrepaidApi;
using Application.Interfaces.Property;
using Application.Interfaces.ServiceLogs;
using Application.Interfaces.Settings;
using Application.Interfaces.SMS;
using Application.Interfaces.Tenant;
using Application.Interfaces.UserServices;
using Application.Interfaces.Ussd;
using Application.Interfaces.Meter;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.BackgroundServices;
using Infrastructure.Services.Collecto;
using Infrastructure.Services.Complaints;
using Infrastructure.Services.Email;
using Infrastructure.Services.PaymentServices;
using Infrastructure.Services.PaymentServices.WalletSvc;
using Infrastructure.Services.PrepaidApi;
using Infrastructure.Services.Property;
using Infrastructure.Services.ServiceLogs;
using Infrastructure.Services.Settings;
using Infrastructure.Services.SMS;
using Infrastructure.Services.Tenant;
using Infrastructure.Services.UserServices;
using Infrastructure.Services.Ussd;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json.Serialization;
using Application.Interfaces.Accounting;
using Infrastructure.Services.Accounting;
using Application.Interfaces.AuditTrail;
using Infrastructure.Services.AuditTrail;
using Application.Interfaces.External;
using Infrastructure.Services.External;
using System.Security.Claims;
using Serilog;
using Application.Interfaces.STSVending;
using API.Filters;
using API.Logging;
using Infrastructure.Services.STSVending;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, loggerConfiguration) =>
{
    loggerConfiguration
        .ReadFrom.Configuration(context.Configuration)
        .WriteTo.Console()
        .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
        .WriteTo.Sink(new ServiceLogDatabaseSink(services.GetRequiredService<IServiceScopeFactory>()));
});

// Configure MySQL connection
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        new MySqlConnector.MySqlConnectionStringBuilder(builder.Configuration.GetConnectionString("DefaultConnection"))
        {
            AllowUserVariables = true
        }.ConnectionString,
        new MySqlServerVersion(new Version(8, 0, 28)))
);

// 1. register the handler itself
builder.Services.AddTransient<LoggingHandler>();

// Register application services
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ISettings, Settings>();
builder.Services.AddScoped<ILandlordPropertyService, PropertyService>();
builder.Services.AddScoped<IRentalContractService, RentalContractService>();
builder.Services.AddScoped<IMaintenanceService, MaintenanceService>();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IArrearsPaymentPlanService, ArrearsPaymentPlanService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IExternalPaymentService, ExternalPaymentService>();
builder.Services.AddScoped<Application.Interfaces.Meter.IMeterTokenService, Infrastructure.Services.Meter.MeterTokenService>();
builder.Services.AddScoped<Application.Interfaces.Meter.IMeterFeeService, Infrastructure.Services.Meter.MeterFeeService>();
builder.Services.AddScoped<IMeterLienService, Infrastructure.Services.Meter.MeterLienService>();
builder.Services.AddScoped<IComplaintService, ComplaintService>();
builder.Services.AddScoped<IWalletService, WalletService>();
builder.Services.AddScoped<CollectionWalletCreditService>();
builder.Services.AddScoped<BillPaymentProcessingService>();
builder.Services.AddScoped<IBackgroundJobLease, BackgroundJobLease>();
builder.Services.AddScoped<IUssdService, UssdService>();
builder.Services.AddScoped<IUssdMenuService, UssdMenuService>();
builder.Services.AddScoped<ISmsProcessor, SmsProcessor>();
builder.Services.AddScoped<IServiceLogsRepository, ServiceLogsRepository>();
builder.Services.AddScoped<IAuditTrailRepository, AuditTrailRepository>();
builder.Services.AddScoped<AuditTrailFilter>();
builder.Services.AddScoped<IExternalPayments, ExternalPayments>();
builder.Services.AddScoped<ICollectoWalletWithdrawalHistoryService, CollectoWalletWithdrawalHistoryService>();

// Accounting services
builder.Services.AddScoped<IAccountingQueryService, AccountingQueryService>();
builder.Services.AddScoped<IAccountingService, AccountingService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IUssdSessionChargeService, UssdSessionChargeService>();
builder.Services.AddScoped<IUtilityProfitabilityService, UtilityProfitabilityService>();
builder.Services.AddScoped<IWalletChargePolicy, ConfigWalletChargePolicy>();
builder.Services.AddScoped<WalletAccountingNotifier>();
builder.Services.AddScoped<ISTSProcessing, STSProcessing>();


builder.Services.AddScoped<IAdminPayoutReconciliation, AdminPayoutReconciliationService>();
builder.Services.AddScoped<Application.Interfaces.Ops.IExceptionQueueService, Infrastructure.Services.Ops.ExceptionQueueService>();
builder.Services.AddScoped<Application.Interfaces.Notifications.INotificationDispatcher, Infrastructure.Services.Notifications.NotificationDispatcher>();
builder.Services.AddScoped<Application.Interfaces.Notifications.INotificationSettingsService, Infrastructure.Services.Notifications.NotificationSettingsService>();
builder.Services.AddScoped<Application.Interfaces.Billing.IRentInvoicingService, Infrastructure.Services.Billing.RentInvoicingService>();
builder.Services.AddScoped<Application.Interfaces.Analytics.IPaymentStatusHistory, Infrastructure.Services.Analytics.PaymentStatusHistory>();
builder.Services.AddScoped<Application.Interfaces.Analytics.IArrearsAnalyticsService, Infrastructure.Services.Analytics.ArrearsAnalyticsService>();
builder.Services.AddScoped<Application.Interfaces.Deposits.IDepositService, Infrastructure.Services.Deposits.DepositService>();
builder.Services.AddScoped<Infrastructure.Services.Maintenance.LogRetentionService>();
builder.Services.AddSingleton<Application.Interfaces.Security.ITotpService, Infrastructure.Services.Security.TotpService>();
builder.Services.AddSingleton<Application.Interfaces.Security.IJwtTokenFactory, Infrastructure.Services.Security.JwtTokenFactory>();
builder.Services.AddScoped<Application.Interfaces.Security.IMfaService, Infrastructure.Services.Security.MfaService>();
builder.Services.AddScoped<PaymentProviderSettingsService>();
builder.Services.AddScoped<ICollectoApiClient, PaymentGatewayRouter>();
builder.Services.AddHttpClient<DangoPaymentClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
})
    // Dango calls use the same request/response logging (log file and HttpRequestResponse table) as Collecto.
    .AddHttpMessageHandler<LoggingHandler>();
builder.Services.AddHttpClient<CollectoService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
})
    // this ensures every outgoing request goes through your LoggingHandler
    .AddHttpMessageHandler<LoggingHandler>();

builder.Services.AddHttpClient<IPrepaidApiClient, PrepaidApiService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
}).AddHttpMessageHandler<LoggingHandler>();

builder.Services.AddHttpClient<IMtnMomoApiClient, MtnMomoService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
})
    .AddHttpMessageHandler<LoggingHandler>();

builder.Services.AddHttpClient<IAirtelApiClient, AirtelService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
})
    .AddHttpMessageHandler<LoggingHandler>();

builder.Services.AddHttpClient<IStanbicApiClient, StanbicService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
})
    .AddHttpMessageHandler<LoggingHandler>();

// Singleton services
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<EmailService>();
builder.Services.AddSingleton<IEmailService>(sp => sp.GetRequiredService<EmailService>());

// Add hosted services
builder.Services.AddHostedService<PaymentProcessor>();
builder.Services.AddHostedService<CheckPaymentStatusProcessor>();
builder.Services.AddHostedService<CreditWalletService>();
builder.Services.AddHostedService<BillPaymentProcessor>();
builder.Services.AddHostedService<PendingWalletWithdrawsProcessor>();
builder.Services.AddHostedService<ProcessPendingTokenTransactions>();
builder.Services.AddHostedService<MonthlyMeterFeeProcessor>();
//builder.Services.AddHostedService<MpesaCallbackProcessor>();
builder.Services.AddHostedService<ProcessMpesaPayments>();
builder.Services.AddHostedService<MeterTokenGeneratorService>();
builder.Services.AddHostedService<ReminderProcessor>();
builder.Services.AddHostedService<UssdImportProcessor>();
builder.Services.AddHostedService<SslCertificateExpiryNotifier>();
// Nightly purge of the diagnostic tables; windows come from LogRetention:* configuration.
builder.Services.AddHostedService<Infrastructure.Services.BackgroundServices.LogRetentionProcessor>();
builder.Services.AddHostedService<Infrastructure.Services.BackgroundServices.RentInvoicingProcessor>();


builder.Services.AddControllers(options =>
    {
        options.Filters.AddService<AuditTrailFilter>();
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles; // EF Core 5.0+ way
    });
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowDangopayFrontend", policy =>
    {
        policy
         .SetIsOriginAllowed(_ => true) // ⚠️ allow ANY origin
                                        //.WithOrigins("https://dangopay.dangotechconcepts.com")
            .AllowAnyHeader()
            .WithExposedHeaders("X-Transaction-Id")
            .AllowAnyMethod()
            .AllowCredentials(); // Optional, only if using cookies or auth headers
    });
});




//builder.Services.AddCors(options =>
//{
//    options.AddPolicy("AllowAll", policy =>
//    {
//        policy.AllowAnyOrigin()
//              .AllowAnyMethod()
//              .AllowAnyHeader();
//    });
//});

//// --- Option 1: Using Auth0 as the external identity provider ---
//builder.Services.AddAuthentication(options =>
//{
//    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
//    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
//})
//.AddJwtBearer(options =>
//{
//    options.Authority = "https://dev-7z1v7v7z.us.auth0.com/";
//    options.Audience = "https://your-api-identifier";
//});
//// --- End Option 1 ---

// --- Option 2: Using your own symmetric key ---
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"];
var issuer = jwtSettings["Issuer"];
var audience = jwtSettings["Audience"];

if (string.IsNullOrEmpty(secretKey) || string.IsNullOrEmpty(issuer) || string.IsNullOrEmpty(audience))
{
    throw new InvalidOperationException("JWT settings are not properly configured.");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
    // Ensure role claims from different identity providers are recognized
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = context =>
        {
            var identity = context.Principal?.Identity as ClaimsIdentity;
            if (identity != null && !identity.HasClaim(c => c.Type == ClaimTypes.Role))
            {
                // Try common role claim names used by JWT providers
                var roleClaim = identity.FindFirst("roles") ?? identity.FindFirst("role") ?? identity.FindFirst(ClaimTypes.Role);
                if (roleClaim != null)
                {
                    identity.AddClaim(new Claim(ClaimTypes.Role, roleClaim.Value));
                }
            }
            return Task.CompletedTask;
        }
    };
});
// --- End Option 2 ---

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
           new OpenApiSecurityScheme
           {
               Reference = new OpenApiReference
               {
                   Type = ReferenceType.SecurityScheme,
                   Id = "Bearer"
               },
               Scheme = "oauth2",
               Name = "Bearer",
               In = ParameterLocation.Header,
           },
           new List<string>()
        }
    });

    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Property Management API",
        Version = "v1"
    });
});

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Credential endpoints are the cheapest target for brute force, so they get their own
// per-IP fixed window instead of a global limit that would also throttle webhooks.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/problem+json";
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            status = StatusCodes.Status429TooManyRequests,
            message = "Too many attempts. Wait a minute and try again."
        }, cancellationToken);
    };
});

var app = builder.Build();

var configuredJwtKey = builder.Configuration["JwtSettings:SecretKey"];
if (!builder.Environment.IsDevelopment() &&
    (string.IsNullOrWhiteSpace(configuredJwtKey) ||
     configuredJwtKey.Contains("Use a secure key", StringComparison.OrdinalIgnoreCase) ||
     configuredJwtKey.Length < 32))
{
    app.Logger.LogWarning(
        "JWT SecretKey is weak or the committed default. Set the JwtSettings__SecretKey environment variable on the server instead of editing appsettings.json.");
}

app.UseStaticFiles(); // For accessing static files if any

// ✅ Apply CORS FIRST
app.UseCors("AllowDangopayFrontend");

app.UseRateLimiter();

// ✅ Then authentication and authorization
app.UseAuthentication();
app.UseAuthorization();

// Apply pending migrations
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var originalCommandTimeout = dbContext.Database.GetCommandTimeout();
    var migrationCommandTimeout = builder.Configuration.GetValue<int?>("Database:MigrationsCommandTimeoutSeconds") ?? 600;
    if (migrationCommandTimeout is < 30 or > 3600)
        throw new InvalidOperationException("Database:MigrationsCommandTimeoutSeconds must be between 30 and 3600.");
    try
    {
        dbContext.Database.SetCommandTimeout(migrationCommandTimeout);
        dbContext.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
        throw;
    }
    finally
    {
        dbContext.Database.SetCommandTimeout(originalCommandTimeout);
    }
}

// Africa’s Talking will POST x-www-form-urlencoded -> sessionId, serviceCode, phoneNumber, text
app.MapPost("/ussd", async (HttpRequest req, IUssdService engine, IConfiguration cfg) =>
{
    var form = await req.ReadFormAsync();
    var sessionId = form["sessionId"].ToString();
    var serviceCode = form["serviceCode"].ToString();
    var phone = form["phoneNumber"].ToString();
    var text = form["text"].ToString();

    // (optional) choose menu by shortcode mapping if you host multiple menus
    var menuCode = "waterpay";
    var currency = cfg["AT:Currency"] ?? "UGX";

    var result = await engine.HandleAsync(sessionId, serviceCode, phone, text, menuCode, currency);
    return Results.Text(result, "text/plain");
})
.Accepts<IFormCollection>("application/x-www-form-urlencoded");

// Swagger
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Property Management API v1");
    c.RoutePrefix = string.Empty;
});

app.MapControllers();

app.Run();
