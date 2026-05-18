using System;
using System.IO;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Health
{
    [Route("api/[controller]")]
    [ApiController]
    public class VersionController : ControllerBase
    {
        [HttpGet("/version")]
        public IActionResult GetVersion()
        {
            var assembly = Assembly.GetEntryAssembly() ?? Assembly.GetExecutingAssembly();
            var name = assembly.GetName();
            var informational = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? string.Empty;
            var fileVersion = assembly.GetCustomAttribute<AssemblyFileVersionAttribute>()?.Version ?? string.Empty;
            var location = assembly.Location;
            DateTime? fileModifiedUtc = null;
            if (!string.IsNullOrWhiteSpace(location) && System.IO.File.Exists(location))
            {
                try
                {
                    fileModifiedUtc = System.IO.File.GetLastWriteTimeUtc(location);
                }
                catch { }
            }

            var result = new
            {
                Application = name.Name,
                Version = name.Version?.ToString() ?? string.Empty,
                InformationalVersion = informational,
                FileVersion = fileVersion,
                AssemblyPath = location,
                AssemblyLastWriteUtc = fileModifiedUtc,
                MachineName = Environment.MachineName,
                Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
                TimestampUtc = DateTime.UtcNow
            };

            return Ok(result);
        }
    }
}
