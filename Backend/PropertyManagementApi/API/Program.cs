using Application.Interfaces.Collecto;
using Application.Interfaces.Complaints;
using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
using Application.Interfaces.PrepaidApi;
using Application.Interfaces.Property;
using Application.Interfaces.ServiceLogs;
using Application.Interfaces.Settings;
using Application.Interfaces.SMS;
using Application.Interfaces.STSVending;
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
using Infrastructure.Services.STSVending;
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
using Application.Interfaces.External;
using Infrastructure.Services.External;
using System.Security.Claims;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Configure MySQL connection
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        new MySqlServerVersion(new Version(8, 0, 28)))
);

// 1. register the handler itself
builder.Services.AddTransient<LoggingHandler>();

// Register application services
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ISettings, Settings>();
builder.Services.AddScoped<ILandlordPropertyService, PropertyService>();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IExternalPaymentService, ExternalPaymentService>();
builder.Services.AddScoped<Application.Interfaces.Meter.IMeterTokenService, Infrastructure.Services.Meter.MeterTokenService>();
builder.Services.AddScoped<IComplaintService, ComplaintService>();
builder.Services.AddScoped<IWalletService, WalletService>();
builder.Services.AddScoped<IUssdService, UssdService>();
builder.Services.AddScoped<ISTSProcessing, STSProcessing>();
builder.Services.AddScoped<ISmsProcessor, SmsProcessor>();
builder.Services.AddScoped<IServiceLogsRepository, ServiceLogsRepository>();
builder.Services.AddScoped<IExternalPayments, ExternalPayments>();

// Accounting services
builder.Services.AddScoped<IAccountingQueryService, AccountingQueryService>();
builder.Services.AddScoped<IAccountingService, AccountingService>();
builder.Services.AddScoped<IWalletChargePolicy, ConfigWalletChargePolicy>();
builder.Services.AddScoped<WalletAccountingNotifier>();



builder.Services.AddHttpClient<ICollectoApiClient, CollectoService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
})
    // this ensures every outgoing request goes through your LoggingHandler
    .AddHttpMessageHandler<LoggingHandler>();

builder.Services.AddHttpClient<IPrepaidApiClient, PrepaidApiService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
}).AddHttpMessageHandler<LoggingHandler>();

// Singleton services
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<EmailService>();

// Add hosted services
builder.Services.AddHostedService<PaymentProcessor>();
builder.Services.AddHostedService<CheckPaymentStatusProcessor>();
builder.Services.AddHostedService<CreditWalletService>();
builder.Services.AddHostedService<PendingWalletWithdrawsProcessor>();
builder.Services.AddHostedService<ProcessPendingTokenTransactions>();
//builder.Services.AddHostedService<MpesaCallbackProcessor>();
builder.Services.AddHostedService<ProcessMpesaPayments>();
builder.Services.AddHostedService<MeterTokenGeneratorService>();


builder.Services.AddControllers()
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

var app = builder.Build();

app.UseStaticFiles(); // For accessing static files if any

// ✅ Apply CORS FIRST
app.UseCors("AllowDangopayFrontend");

// ✅ Then authentication and authorization
app.UseAuthentication();
app.UseAuthorization();

// Apply pending migrations
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        dbContext.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
        throw;
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
