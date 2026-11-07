using Application.Interfaces.Deposits;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers.Deposits;

[ApiController]
[Authorize(Roles = "Administrator")]
[Route("api/Deposits")]
public sealed class DepositsController(IDepositService deposits) : ControllerBase
{
    private string? Actor => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(ClaimTypes.Email);

    /// <summary>Deposits held across contracts, with the move-out status of each.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(DepositPage), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct,
        [FromQuery] string? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (page < 1 || pageSize is < 1 or > 200)
            return BadRequest(new { message = "page must be at least 1 and pageSize between 1 and 200." });

        return Ok(await deposits.GetDepositsAsync(status, page, pageSize, ct));
    }

    /// <summary>Move-out statement: deposit held, unpaid arrears, deductions and the resulting refund.</summary>
    [HttpGet("{rentalContractId:int}")]
    [ProducesResponseType(typeof(MoveOutStatementDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatement(int rentalContractId, CancellationToken ct)
    {
        try
        {
            return Ok(await deposits.GetStatementAsync(rentalContractId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{rentalContractId:int}/deductions")]
    [ProducesResponseType(typeof(DepositDeductionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AddDeduction(int rentalContractId, [FromBody] AddDepositDeductionRequest request, CancellationToken ct)
    {
        try
        {
            var deduction = await deposits.AddDeductionAsync(
                rentalContractId, request.Category, request.Amount, request.Description, Actor, ct);
            return Ok(deduction);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("deductions/{deductionId:int}")]
    public async Task<IActionResult> RemoveDeduction(int deductionId, CancellationToken ct)
    {
        try
        {
            await deposits.RemoveDeductionAsync(deductionId, Actor, ct);
            return Ok(new { message = "Deduction removed." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>Settles the tenancy: arrears first, then deductions, and terminates the contract.</summary>
    [HttpPost("{rentalContractId:int}/settle")]
    [ProducesResponseType(typeof(SettleDepositResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Settle(int rentalContractId, [FromBody] SettleDepositRequest? request, CancellationToken ct)
    {
        try
        {
            return Ok(await deposits.SettleAsync(rentalContractId, Actor, request?.Notes, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

public sealed record AddDepositDeductionRequest(string Category, decimal Amount, string? Description);

public sealed record SettleDepositRequest(string? Notes);
