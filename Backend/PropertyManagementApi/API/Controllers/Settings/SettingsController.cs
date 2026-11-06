using Application.Interfaces.ServiceLogs;
using Application.Interfaces.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.IO;
using System.Text.RegularExpressions;

namespace API.Controllers.Settings
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly IServiceLogsRepository _serviceLogsRepository;
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

        public SettingsController(ISettings settings, IWebHostEnvironment environment, IServiceLogsRepository serviceLogsRepository)
        {
            _settings = settings;
            _environment = environment;
            _serviceLogsRepository = serviceLogsRepository;
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
                    source = log.Source,
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

        // Serilog.Sinks.File keeps the active log open for writing with FileShare.Read, which makes a
        // plain File.ReadAllText fail with "used by another process". Very large files are tail-read.
        private const long MaxLogContentBytes = 5 * 1024 * 1024;

        [HttpGet("/GetSerilogLogFileContent")]
        [Authorize]
        public async Task<IActionResult> GetSerilogLogFileContent([FromQuery] string fileName, CancellationToken ct)
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

                var (content, truncated) = await ReadSharedLogFileAsync(filePath, ct);
                var fileInfo = new FileInfo(filePath);

                return Ok(new
                {
                    fileName = fileInfo.Name,
                    sizeBytes = fileInfo.Length,
                    lastModified = fileInfo.LastWriteTimeUtc,
                    truncated,
                    content = MaskSensitiveText(content)
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while retrieving log file content.", error = ex.Message });
            }
        }

        // Opens the file alongside the logger's write handle instead of fighting it for exclusive access.
        private static async Task<(string Content, bool Truncated)> ReadSharedLogFileAsync(string filePath, CancellationToken ct)
        {
            await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read,
                FileShare.ReadWrite | FileShare.Delete, 4096, FileOptions.Asynchronous | FileOptions.SequentialScan);
            var truncated = stream.Length > MaxLogContentBytes;
            if (truncated)
            {
                stream.Seek(-MaxLogContentBytes, SeekOrigin.End);
            }

            using var reader = new StreamReader(stream, detectEncodingFromByteOrderMarks: true);
            var content = await reader.ReadToEndAsync(ct);
            if (truncated)
            {
                // Drop the partial first line produced by seeking into the middle of the file.
                var firstNewline = content.IndexOf('\n');
                content = firstNewline >= 0 ? content[(firstNewline + 1)..] : string.Empty;
            }

            return (content, truncated);
        }

        [HttpPost("/ImportSerilogLogsToDb")]
        [Authorize]
        public async Task<IActionResult> ImportSerilogLogsToDb([FromQuery] string? fileName = null)
        {
            try
            {
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;
                if (userrole == null || !userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }

                var logsDirectory = Path.Combine(_environment.ContentRootPath, "logs");
                var result = await _serviceLogsRepository.ImportSerilogFilesAsync(logsDirectory, fileName);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while importing Serilog logs to the database.", error = ex.Message });
            }
        }

        [HttpGet("/GetDbServiceLogs")]
        [Authorize]
        public async Task<IActionResult> GetDbServiceLogs([FromQuery] DateTime startDate, [FromQuery] DateTime endDate,
            [FromQuery] string? sourceType = null, [FromQuery] string? search = null,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
        {
            try
            {
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;
                if (userrole == null || !userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }

                if (endDate.Date < startDate.Date)
                {
                    return BadRequest(new { message = "The end date cannot be before the start date." });
                }

                if (page < 1 || pageSize is < 1 or > 200)
                {
                    return BadRequest(new { message = "page must be at least 1 and pageSize between 1 and 200." });
                }

                if (search?.Length > 128)
                {
                    return BadRequest(new { message = "search must be 128 characters or fewer." });
                }

                var (logs, total) = await _serviceLogsRepository.GetPagedByDateRangeAsync(
                    startDate, endDate, sourceType, search, page, pageSize, ct);
                var maskedLogs = logs.Select(log => new
                {
                    id = log.Id,
                    serviceName = log.ServiceName,
                    logDate = log.LogDate,
                    logLevel = log.LogLevel,
                    message = MaskSensitiveText(log.Message),
                    exception = MaskSensitiveText(log.Exception),
                    sourceType = log.SourceType,
                    sourceIdentifier = log.SourceIdentifier,
                    rawContent = MaskSensitiveText(log.RawContent),
                    eventHash = log.EventHash,
                }).ToList();

                return Ok(new { items = maskedLogs, page, pageSize, total });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while retrieving database service logs.", error = ex.Message });
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
