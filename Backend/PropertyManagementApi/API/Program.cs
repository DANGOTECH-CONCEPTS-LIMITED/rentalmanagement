using Application.Interfaces;
using Infrastructure.Data;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
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

// Set up Swagger for generating the API documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Property Management API",
        Version = "v1"
    });
});

var app = builder.Build();

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
