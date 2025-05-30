﻿using Application.Interfaces.Collecto;
using Domain.Dtos.Collecto;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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
        public async Task<IActionResult> RequestToPay([FromBody] RequestToPayRequestDto request)
        {
            try
            {
                var response = await _collectoApiClient.RequestToPayAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/requestToPayStatus")]
        public async Task<IActionResult> RequestToPayStatus([FromBody] RequestToPayStatusRequestDto request)
        {
            try
            {
                var response = await _collectoApiClient.GetRequestToPayStatusAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/servicePayment")]
        public async Task<IActionResult> ServicePayment([FromBody] ServicePaymentRequestDto request)
        {
            try
            {
                var response = await _collectoApiClient.ServicePaymentAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/servicePaymentStatus")]
        public async Task<IActionResult> ServicePaymentStatus([FromBody] ServicePaymentStatusRequestDto request)
        {
            try
            {
                var response = await _collectoApiClient.GetServicePaymentStatusAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/sendSingleSms")]
        public async Task<IActionResult> SendSingleSms([FromBody] SendSingleSmsRequestDto request)
        {
            try
            {
                var response = await _collectoApiClient.SendSingleSmsAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/currentBalance")]
        public async Task<IActionResult> CurrentBalance([FromBody] CurrentBalanceRequestDto request)
        {
            try
            {
                var response = await _collectoApiClient.GetCurrentBalanceAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/verifyPhoneNumber")]
        public async Task<IActionResult> VerifyPhoneNumber([FromBody] VerifyPhoneNumberRequestDto request)
        {
            try
            {
                var response = await _collectoApiClient.VerifyPhoneNumberAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        //[HttpPost("/initiatePayout")]
        //public async Task<IActionResult> InitiatePayout([FromBody] InitiatePayoutRequest request)
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

        //[HttpPost("/payoutStatus")]
        //public async Task<IActionResult> PayoutStatus([FromBody] PayoutStatusRequest request)
        //{
        //    try
        //    {
        //        var response = await _collectoApiClient.GetPayoutStatusAsync(request);
        //        return Ok(response);
        //    }
        //    catch (Exception ex)
        //    {
        //        return BadRequest(ex.Message);
        //    }
        //}

    }
}
