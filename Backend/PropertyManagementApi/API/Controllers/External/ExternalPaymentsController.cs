using Application.Interfaces.External;
using Domain.Dtos.External;
using Domain.Entities.External;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.CodeAnalysis.Differencing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace API.Controllers.External
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExternalPaymentsController : ControllerBase
    {
        private readonly IConfiguration _cfg;
        private readonly ILogger<ExternalPaymentsController> _logger;
        private readonly AppDbContext _db;
        private IExternalPayments _externalPayments;

        public ExternalPaymentsController(
            ILogger<ExternalPaymentsController> logger,
            IExternalPayments externalPayments  )
        {
            _logger = logger;
            _externalPayments = externalPayments;
        }

        [HttpPost("/mpesa-callback")]
        public async Task<IActionResult> MpesaCallbackOld([FromBody] MpesaCallbackDto dto)
        {
            try
            {
                var auth = Request.Headers["Authorization"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(auth))
                {
                    if (!string.IsNullOrWhiteSpace(auth) && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                        auth = auth.Substring("Bearer ".Length).Trim();
                }
                else 
                {
                    _logger.LogWarning("Unauthorized callback attempt. Missing token header.");
                    return Unauthorized("Missing token.");
                }

                var headers = string.Join(";", Request.Headers.Select(h => $"{h.Key}={h.Value}"));
                await _externalPayments.RecordMpesaPayment(dto, auth, headers);
                return Ok(new { received = true, message = "Callback processed successfully" });
            }catch (UnauthorizedAccessException uaex)
            {
                _logger.LogWarning(uaex, "Unauthorized callback attempt.");
                return Unauthorized("Invalid token.");
            }   
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing MPESA callback");
                return StatusCode(500, "Error processing callback");
            }
            
        }

        /// <summary>
        /// MPESA (or other) callback endpoint.
        /// Secured by configurable token header: X-Callback-Token (or Bearer in Authorization).
        /// Logs full request to database for audit.
        /// </summary>
        /// <remarks>
        /// Example request body:
        /// {
        ///  "TransactionType":"Pay Bill",
        ///  "TransID":"TCP04M1HHO",
        ///  "TransTime":"20250325235409",
        ///  "TransAmount":"10.00",
        ///  "BusinessShortCode":"4141247",
        ///  "BillRefNumber":"58000244879",
        ///  "InvoiceNumber":"",
        ///  "OrgAccountBalance":"0",
        ///  "ThirdPartyTransID":"",
        ///  "MSISDN":"697611420...",
        ///  "FirstName":"JOHN"
        /// }
        /// </remarks>
        //[HttpPost("mpesa-callback")]
        //public async Task<IActionResult> MpesaCallback([FromBody] MpesaCallbackDto dto)
        //{
        //    var expected = _cfg["ExternalApi:CallbackToken"]; // required config
        //    if (string.IsNullOrWhiteSpace(headerToken) || headerToken != expected)
        //    {
        //        _logger.LogWarning("Unauthorized callback attempt. Provided token missing or invalid.");
        //        return Unauthorized("Invalid token.");
        //    }

        //    string payload = string.Empty;
        //    try
        //    {
        //        payload = JsonSerializer.Serialize(dto);
        //    }
        //    catch
        //    {
        //        payload = "<unserializable>";
        //    }
        //    var headers = string.Join(";", Request.Headers.Select(h => $"{h.Key}={h.Value}"));

            

        //    try
        //    {
        //        await _db.MpesaCallbackAudits.AddAsync(audit);
        //        await _db.SaveChangesAsync();
        //    }
        //    catch (Exception ex)
        //    {
        //        _logger.LogError(ex, "Failed to persist callback audit for TransID={TransId}", dto?.TransID);
        //        // still return success to caller to avoid retries, but log
        //        return StatusCode(500, "Failed to persist callback");
        //    }

        //    // Optionally do domain processing asynchronously (enqueue background job).
        //    // For now just acknowledge.
        //    _logger.LogInformation("Accepted callback audit id {Id} for TransID={TransId}", audit.Id, audit.TransId);

        //    return Ok(new { received = true, auditId = audit.Id });
        //}
    }
}