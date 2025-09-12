using Application.Interfaces.Collecto;
using Application.Interfaces.Complaints;
using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
using Application.Interfaces.PrepaidApi;
using Application.Interfaces.Property;
using Application.Interfaces.Settings;
using Application.Interfaces.STSVending;
using Application.Interfaces.Tenant;
using Application.Interfaces.UserServices;
using Application.Interfaces.Ussd;
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
using Infrastructure.Services.Settings;
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

var builder = WebApplication.CreateBuilder(args);

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
builder.Services.AddScoped<IComplaintService, ComplaintService>();
builder.Services.AddScoped<IWalletService, WalletService>();
builder.Services.AddScoped<IUssdService, UssdService>();
builder.Services.AddScoped<ISTSProcessing, STSProcessing>();
//builder.Services.AddScoped<ICollectoApiClient, CollectoService>();

builder.Services.AddHttpClient<ICollectoApiClient, CollectoService>()
    // this ensures every outgoing request goes through your LoggingHandler
    .AddHttpMessageHandler<LoggingHandler>();

builder.Services.AddHttpClient<IPrepaidApiClient, PrepaidApiService>().AddHttpMessageHandler<LoggingHandler>();

// Singleton services
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<EmailService>();

// Add hosted services
builder.Services.AddHostedService<PaymentProcessor>();
builder.Services.AddHostedService<CheckPaymentStatusProcessor>();
builder.Services.AddHostedService<CreditWalletService>();
builder.Services.AddHostedService<PendingWalletWithdrawsProcessor>();
builder.Services.AddHostedService<ProcessPendingTokenTransactions>();

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
    dbContext.Database.Migrate();
}

// Swagger
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Property Management API v1");
    c.RoutePrefix = string.Empty;
});

app.MapControllers();

app.Run();
