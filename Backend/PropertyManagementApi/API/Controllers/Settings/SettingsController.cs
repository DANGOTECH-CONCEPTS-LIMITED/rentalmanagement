using Application.Interfaces.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Text.RegularExpressions;

namespace API.Controllers.Settings
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly ISettings _settings;
        private readonly IWebHostEnvironment _environment;
        private static readonly string MaskedValue = "***MASKED***";
        private static readonly Regex SensitiveJsonLikePattern = new(
            "(?i)(\"?(api[_-]?key|secret|password|token|authorization|subscription[_-]?key|client[_-]?secret|x-api-key)\"?\\s*[:=]\\s*\"?)([^\",\\r\\n&]+)(\"?)",
            RegexOptions.Compiled);
        private static readonly Regex BearerTokenPattern = new(
            "(?i)(Bearer\\s+)([^\\s\",]+)",
            RegexOptions.Compiled);
        private static readonly Regex SensitiveQueryPattern = new(
            "(?i)((api[_-]?key|secret|password|token|subscription[_-]?key|client[_-]?secret)=)([^&\\s]+)",
            RegexOptions.Compiled);

        public SettingsController(ISettings settings, IWebHostEnvironment environment)
        {
            _settings = settings;
            _environment = environment;
        }

        [HttpGet("/GetRequestResponseByDate")]
        [Authorize]
        public async Task<IActionResult> GetRequestResponseByDate([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                var logs = await _settings.GetRequestResponseByDate(startDate, endDate);
                var maskedLogs = logs.Select(log => new
                {
                    id = log.Id,
                    request = MaskSensitiveText(log.Request),
                    response = MaskSensitiveText(log.Response),
                    status = log.Status,
                    errorMessage = log.ErrorMessage,
                    requestType = log.RequestType,
                    requestUrl = MaskSensitiveText(log.RequestUrl),
                    createdAt = log.CreatedAt
                });

                return Ok(maskedLogs);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while retrieving the logs.", error = ex.Message });
            }
        }

        [HttpGet("/GetSerilogLogFiles")]
        [Authorize]
        public IActionResult GetSerilogLogFiles()
        {
            try
            {
                var logsDirectory = Path.Combine(_environment.ContentRootPath, "logs");

                if (!Directory.Exists(logsDirectory))
                {
                    return Ok(Array.Empty<object>());
                }

                var files = new DirectoryInfo(logsDirectory)
                    .GetFiles("*.txt", SearchOption.TopDirectoryOnly)
                    .OrderByDescending(file => file.LastWriteTimeUtc)
                    .Select(file => new
                    {
                        FileName = file.Name,
                        SizeBytes = file.Length,
                        LastModified = file.LastWriteTimeUtc
                    })
                    .ToList();

                return Ok(files);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while retrieving log files.", error = ex.Message });
            }
        }

        [HttpGet("/GetSerilogLogFileContent")]
        [Authorize]
        public IActionResult GetSerilogLogFileContent([FromQuery] string fileName)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(fileName))
                {
                    return BadRequest(new { message = "fileName is required." });
                }

                var sanitizedFileName = Path.GetFileName(fileName);
                var logsDirectory = Path.Combine(_environment.ContentRootPath, "logs");
                var filePath = Path.Combine(logsDirectory, sanitizedFileName);

                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound(new { message = "Requested log file was not found." });
                }

                var content = System.IO.File.ReadAllText(filePath);
                var fileInfo = new FileInfo(filePath);

                return Ok(new
                {
                    fileName = fileInfo.Name,
                    sizeBytes = fileInfo.Length,
                    lastModified = fileInfo.LastWriteTimeUtc,
                    content = MaskSensitiveText(content)
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while retrieving log file content.", error = ex.Message });
            }
        }

        private static string MaskSensitiveText(string? text)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return text ?? string.Empty;
            }

            var masked = SensitiveJsonLikePattern.Replace(
                text,
                match => $"{match.Groups[1].Value}{MaskedValue}{match.Groups[4].Value}");

            masked = BearerTokenPattern.Replace(
                masked,
                match => $"{match.Groups[1].Value}{MaskedValue}");

            masked = SensitiveQueryPattern.Replace(
                masked,
                match => $"{match.Groups[1].Value}{MaskedValue}");

            return masked;
        }
    }
}
