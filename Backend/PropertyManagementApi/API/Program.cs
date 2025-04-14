using Application.Interfaces.Property;
using Application.Interfaces.Settings;
using Application.Interfaces.Tenant;
using Application.Interfaces.UserServices;
using Domain.Entities;
using Infrastructure.Data;
using Infrastructure.Services.Email;
using Infrastructure.Services.Property;
using Infrastructure.Services.Settings;
using Infrastructure.Services.Tenant;
using Infrastructure.Services.UserServices;
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

// Register application services
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ISettings, Settings>();
builder.Services.AddScoped<ILandlordPropertyService, PropertyService>();
builder.Services.AddScoped<ITenantService, TenantService>();        

// Singleton services
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<EmailService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles; // EF Core 5.0+ way
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

//// --- Option 1: Using Auth0 as the external identity provider ---
//// Configure JWT Authentication using Auth0
//builder.Services.AddAuthentication(options =>
//{
//    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
//    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
//})
//.AddJwtBearer(options =>
//{
//    // These values should match your Auth0 settings.
//    options.Authority = "https://dev-7z1v7v7z.us.auth0.com/";
//    // Set this to your API Identifier configured in Auth0 (e.g., "https://your-api-identifier")
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
    // Add JWT support to Swagger
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

var app = builder.Build();

app.UseStaticFiles(); // For accessing static files if any

// Configure CORS
app.UseCors("AllowAll");

// Apply pending migrations (note: remove EnsureCreated/EnsureDeleted for production)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

// Always show Swagger (adjust RoutePrefix if needed)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    // If hosting in a subdirectory, adjust the SwaggerEndpoint path accordingly.
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Property Management API v1");
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
