using Application.Interfaces.Property;
using Application.Interfaces.Settings;
using Application.Interfaces.UserServices;
using Domain.Entities;
using Infrastructure.Data;
using Infrastructure.Services.Email;
using Infrastructure.Services.Property;
using Infrastructure.Services.Settings;
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



//singleton services
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

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"];   // e.g., "ThisIsASecretKeyForJwt"
var issuer = jwtSettings["Issuer"];           // e.g., "YourCompany"
var audience = jwtSettings["Audience"];       // e.g., "YourAppClients"

// Configure JWT authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
        .AddJwtBearer(options =>
        {
            options.Authority = "https://dev-7z1v7v7z.us.auth0.com/";
            options.Audience = "https://localhost:5001";
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

// Set up Swagger for generating the API documentation
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
app.UseStaticFiles(); // For accessing static files

// Configure CORS
app.UseCors("AllowAll");

// Apply pending migrations (remove EnsureCreated and EnsureDeleted for production)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

// Always show Swagger (adjust the endpoint if your app runs in a subdirectory)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    // If your site uses a base path, uncomment and set it accordingly:
    // c.RoutePrefix = "PropertyManagementApi";
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Property Management API v1");
});

app.UseAuthorization();
app.MapControllers();

app.Run();
