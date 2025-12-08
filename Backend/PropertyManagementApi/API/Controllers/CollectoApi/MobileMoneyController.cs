using Application.Interfaces.Collecto;
using Domain.Dtos.Collecto;
using Dtos.Collecto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel;
using System.Security.Claims;

namespace API.Controllers.CollectoApi
{
    [Route("api/[controller]")]
    [ApiController]

    public class MobileMoneyController : ControllerBase
    {
        private readonly ICollectoApiClient _collectoApiClient;

        public MobileMoneyController(ICollectoApiClient collectoApiClient)
        {
            _collectoApiClient = collectoApiClient;
        }

        [HttpPost("/requestToPay")]
        [Authorize]
        public async Task<IActionResult> RequestToPay([FromBody] RequestToPayRequestDto request)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                if (!userrole.Equals("Administrator"))
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
                if (!userrole.Equals("Administrator"))
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
                if (!userrole.Equals("Administrator"))
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
                if (!userrole.Equals("Administrator"))
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
                if (!userrole.Equals("Administrator"))
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
                if (!userrole.Equals("Administrator"))
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
        [Authorize]
        public async Task<IActionResult> VerifyPhoneNumber([FromBody] VerifyPhoneNumberRequestDto request)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                if (!userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }
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
                if (!userrole.Equals("Administrator"))
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

        [HttpPost("/initiateBankPayout")]
        [Authorize]
        [Authorize]
        public async Task<IActionResult> InitiatePayout([FromBody] InitiatePayoutBankRequestDto request)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                if (!userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }
                var response = await _collectoApiClient.InitiateBankPayoutAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/payoutStatus")]
        [Authorize]
        public async Task<IActionResult> PayoutStatus([FromBody] PayoutStatusRequestDto request)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                if (!userrole.Equals("Administrator"))
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

        [HttpPost("/withdrawToCollectoApi")]
        [Authorize]
        public async Task<IActionResult> WithdrawToCollectoApi([FromBody] CollectoWithdrawRequest request)
        {
            try
            {
                var response = await _collectoApiClient.WithdrawToCollectoApi(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/withdrawFromCollectoWallet")]
        [Description("Withdraw funds from Collecto Wallet to a bank account or mobile money account. withdrawTo = <\"mobilemoney\", \"stanbic\", \"flexipay\", \"SMS\", \"BULK\", \"ADS\", \"EMAILS\", \"AIRTIME\">")]
        [Authorize]
        public async Task<IActionResult> WithdrawFromCollectoWallet([FromBody] WithdrawFromCollectoWalletDto walletDto)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value ?? User.Identity?.Name;
                var userrole = User.FindFirst(ClaimTypes.Role)?.Value;//User.IsInRole("role", "CollectoAdmin");
                if (!userrole.Equals("Administrator"))
                {
                    return Unauthorized();
                }
                var response = await _collectoApiClient.WithdrawFromCollectoWallet(walletDto);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
