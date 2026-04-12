using Application.Interfaces.Collecto;
using Domain.Dtos.Collecto;
using Domain.Entities.PropertyMgt;
using Dtos.Collecto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel;
using System.Security.Claims;
using System.Text.Json;

namespace API.Controllers.CollectoApi
{
    [Route("api/[controller]")]
    [ApiController]

    public class MobileMoneyController : ControllerBase
    {
        private readonly ICollectoApiClient _collectoApiClient;
        private readonly ICollectoWalletWithdrawalHistoryService _withdrawalHistoryService;

        public MobileMoneyController(
            ICollectoApiClient collectoApiClient,
            ICollectoWalletWithdrawalHistoryService withdrawalHistoryService)
        {
            _collectoApiClient = collectoApiClient;
            _withdrawalHistoryService = withdrawalHistoryService;
        }

        [HttpPost("/requestToPay")]
        [Authorize]
        public async Task<IActionResult> RequestToPay([FromBody] RequestToPayRequestDto request)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                if (userrole == null || !userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }
                var response = await _collectoApiClient.RequestToPayAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/requestToPayStatus")]
        [Authorize]
        public async Task<IActionResult> RequestToPayStatus([FromBody] RequestToPayStatusRequestDto request)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                if (userrole == null || !userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }
                var response = await _collectoApiClient.GetRequestToPayStatusAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/servicePayment")]
        [Authorize]
        public async Task<IActionResult> ServicePayment([FromBody] ServicePaymentRequestDto request)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                if (userrole == null || !userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }
                var response = await _collectoApiClient.ServicePaymentAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/servicePaymentStatus")]
        [Authorize]
        public async Task<IActionResult> ServicePaymentStatus([FromBody] ServicePaymentStatusRequestDto request)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                if (userrole == null || !userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }
                var response = await _collectoApiClient.GetServicePaymentStatusAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/sendSingleSms")]
        [Authorize]
        public async Task<IActionResult> SendSingleSms([FromBody] SendSingleSmsRequestDto request)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                if (userrole == null || !userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }
                var response = await _collectoApiClient.SendSingleSmsAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/currentBalance")]
        [Authorize]
        public async Task<IActionResult> CurrentBalance([FromBody] CurrentBalanceRequestDto request)
        {

            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;
                if (userrole == null || !userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }
                var response = await _collectoApiClient.GetCurrentBalanceAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/verifyPhoneNumber")]
        //[Authorize]
        public async Task<IActionResult> VerifyPhoneNumber([FromBody] VerifyPhoneNumberRequestDto request)
        {
            try
            {
                //var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                //var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                //if (!userrole.Equals("Administrator"))
                //{
                //    return Unauthorized();
                //}
                var response = await _collectoApiClient.VerifyPhoneNumberAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/GetSupportedBanks")]
        [Authorize]
        public async Task<IActionResult> GetSupportedBanks(string request) 
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                if (userrole == null || !userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }
                var response = await _collectoApiClient.GetSupportedBanksAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        //[HttpPost("/initiatePayout")]
        //public async Task<IActionResult> InitiatePayout([FromBody] InitiatePayoutRequestDto request)
        //{
        //    try
        //    {
        //        var response = await _collectoApiClient.InitiatePayoutAsync(request);
        //        return Ok(response);
        //    }
        //    catch (Exception ex)
        //    {
        //        return BadRequest(ex.Message);
        //    }
        //}

        //[HttpPost("/initiateBankPayout")]
        //[Authorize]
        //[Authorize]
        //public async Task<IActionResult> InitiatePayout([FromBody] InitiatePayoutBankRequestDto request)
        //{
        //    try
        //    {
        //        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
        //        var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
        //        if (userrole == null || !userrole.Equals("Administrator"))
        //        {
        //            return Unauthorized();
        //        }
        //        var response = await _collectoApiClient.InitiateBankPayoutAsync(request);
        //        return Ok(response);
        //    }
        //    catch (Exception ex)
        //    {
        //        return BadRequest(ex.Message);
        //    }
        //}

        [HttpPost("/payoutStatus")]
        [Authorize]
        public async Task<IActionResult> PayoutStatus([FromBody] PayoutStatusRequestDto request)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                if (userrole == null || !userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }
                var response = await _collectoApiClient.GetPayoutStatusAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        //[HttpPost("/withdrawToCollectoApi")]
        //[Authorize]
        //public async Task<IActionResult> WithdrawToCollectoApi([FromBody] CollectoWithdrawRequest request)
        //{
        //    try
        //    {
        //        var response = await _collectoApiClient.WithdrawToCollectoApi(request);
        //        return Ok(response);
        //    }
        //    catch (Exception ex)
        //    {
        //        return BadRequest(ex.Message);
        //    }
        //}

        [HttpPost("/withdrawFromCollectoWallet")]
        [Description("Withdraw funds from Collecto Wallet to a bank account or mobile money account. withdrawTo = <\"mobilemoney\", \"stanbic\", \"flexipay\", \"SMS\", \"BULK\", \"ADS\", \"EMAILS\", \"AIRTIME\">")]
        [Authorize]
        public async Task<IActionResult> WithdrawFromCollectoWallet([FromBody] WithdrawFromCollectoWalletDto walletDto)
        {
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
            var userrole = User.FindFirst(ClaimTypes.Role)?.Value;
            var endpointRequestPayload = JsonSerializer.Serialize(walletDto);

            try
            {
                if (userrole == null || !userrole.Equals("Administrator"))
                {
                    await _withdrawalHistoryService.CreateAsync(new CollectoWalletWithdrawalHistory
                    {
                        Reference = walletDto.reference ?? string.Empty,
                        Amount = decimal.TryParse(walletDto.amount, out var unauthorizedAmount) ? unauthorizedAmount : 0m,
                        WithdrawTo = walletDto.withdrawTo ?? string.Empty,
                        RequestedByEmail = userEmail ?? string.Empty,
                        RequestedByRole = userrole ?? string.Empty,
                        EndpointRequestUrl = "/withdrawFromCollectoWallet",
                        EndpointRequestPayload = endpointRequestPayload,
                        EndpointResponsePayload = "Unauthorized",
                        EndpointStatus = "FAILED",
                        CollectoRequestUrl = string.Empty,
                        CollectoRequestPayload = string.Empty,
                        CollectoResponsePayload = string.Empty,
                        CollectoHttpStatusCode = 401,
                        CollectoStatus = "Unauthorized",
                        IsSuccess = false,
                        ErrorMessage = "Unauthorized",
                    });
                    return Unauthorized();
                }

                if (string.IsNullOrWhiteSpace(walletDto.reference) ||
                    string.IsNullOrWhiteSpace(walletDto.amount) ||
                    string.IsNullOrWhiteSpace(walletDto.withdrawTo))
                {
                    await _withdrawalHistoryService.CreateAsync(new CollectoWalletWithdrawalHistory
                    {
                        Reference = walletDto.reference ?? string.Empty,
                        Amount = decimal.TryParse(walletDto.amount, out var missingFieldAmount) ? missingFieldAmount : 0m,
                        WithdrawTo = walletDto.withdrawTo ?? string.Empty,
                        RequestedByEmail = userEmail ?? string.Empty,
                        RequestedByRole = userrole ?? string.Empty,
                        EndpointRequestUrl = "/withdrawFromCollectoWallet",
                        EndpointRequestPayload = endpointRequestPayload,
                        EndpointResponsePayload = "reference, amount and withdrawTo are required.",
                        EndpointStatus = "FAILED",
                        CollectoRequestUrl = string.Empty,
                        CollectoRequestPayload = string.Empty,
                        CollectoResponsePayload = string.Empty,
                        CollectoHttpStatusCode = 400,
                        CollectoStatus = "BadRequest",
                        IsSuccess = false,
                        ErrorMessage = "reference, amount and withdrawTo are required.",
                    });
                    return BadRequest("reference, amount and withdrawTo are required.");
                }

                if (!decimal.TryParse(walletDto.amount, out var amount) || amount <= 0)
                {
                    await _withdrawalHistoryService.CreateAsync(new CollectoWalletWithdrawalHistory
                    {
                        Reference = walletDto.reference ?? string.Empty,
                        Amount = decimal.TryParse(walletDto.amount, out var invalidAmount) ? invalidAmount : 0m,
                        WithdrawTo = walletDto.withdrawTo ?? string.Empty,
                        RequestedByEmail = userEmail ?? string.Empty,
                        RequestedByRole = userrole ?? string.Empty,
                        EndpointRequestUrl = "/withdrawFromCollectoWallet",
                        EndpointRequestPayload = endpointRequestPayload,
                        EndpointResponsePayload = "amount must be a valid number greater than zero.",
                        EndpointStatus = "FAILED",
                        CollectoRequestUrl = string.Empty,
                        CollectoRequestPayload = string.Empty,
                        CollectoResponsePayload = string.Empty,
                        CollectoHttpStatusCode = 400,
                        CollectoStatus = "BadRequest",
                        IsSuccess = false,
                        ErrorMessage = "amount must be a valid number greater than zero.",
                    });
                    return BadRequest("amount must be a valid number greater than zero.");
                }

                var response = await _collectoApiClient.WithdrawFromCollectoWallet(walletDto);

                await _withdrawalHistoryService.CreateAsync(new CollectoWalletWithdrawalHistory
                {
                    Reference = walletDto.reference,
                    Amount = amount,
                    WithdrawTo = walletDto.withdrawTo,
                    RequestedByEmail = userEmail ?? string.Empty,
                    RequestedByRole = userrole ?? string.Empty,
                    EndpointRequestUrl = "/withdrawFromCollectoWallet",
                    EndpointRequestPayload = endpointRequestPayload,
                    EndpointResponsePayload = response.ResponsePayload,
                    EndpointStatus = response.IsSuccess ? "SUCCESS" : "FAILED",
                    CollectoRequestUrl = response.RequestUrl,
                    CollectoRequestPayload = response.RequestPayload,
                    CollectoResponsePayload = response.ResponsePayload,
                    CollectoHttpStatusCode = response.HttpStatusCode,
                    CollectoStatus = response.Status,
                    IsSuccess = response.IsSuccess,
                    ErrorMessage = response.ErrorMessage,
                });

                if (!response.IsSuccess)
                {
                    return StatusCode(response.HttpStatusCode, new
                    {
                        message = response.ErrorMessage,
                        response = response.ResponsePayload,
                    });
                }

                return Ok(new
                {
                    message = "Withdrawal request submitted successfully.",
                    response = response.ResponsePayload,
                    status = response.Status,
                });
            }
            catch (Exception ex)
            {
                await _withdrawalHistoryService.CreateAsync(new CollectoWalletWithdrawalHistory
                {
                    Reference = walletDto.reference ?? string.Empty,
                    Amount = decimal.TryParse(walletDto.amount, out var amount) ? amount : 0m,
                    WithdrawTo = walletDto.withdrawTo ?? string.Empty,
                    RequestedByEmail = userEmail ?? string.Empty,
                    RequestedByRole = userrole ?? string.Empty,
                    EndpointRequestUrl = "/withdrawFromCollectoWallet",
                    EndpointRequestPayload = endpointRequestPayload,
                    EndpointResponsePayload = ex.Message,
                    EndpointStatus = "FAILED",
                    CollectoRequestUrl = string.Empty,
                    CollectoRequestPayload = endpointRequestPayload,
                    CollectoResponsePayload = string.Empty,
                    CollectoHttpStatusCode = 500,
                    CollectoStatus = "InternalServerError",
                    IsSuccess = false,
                    ErrorMessage = ex.Message,
                });
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetCollectoWalletWithdrawalHistory")]
        [Authorize]
        public async Task<IActionResult> GetCollectoWalletWithdrawalHistory([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;
                if (userrole == null || !userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }

                var history = await _withdrawalHistoryService.GetByDateRangeAsync(startDate, endDate);
                return Ok(history);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
