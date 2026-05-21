using Application.Interfaces.Contract;
using Domain.Dtos.Contract;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Contract
{
    [Route("api/[controller]")]
    [ApiController]
    public class RentalContractController : ControllerBase
    {
        private readonly IRentalContractService _contractService;

        public RentalContractController(IRentalContractService contractService)
        {
            _contractService = contractService;
        }

        [HttpGet("/GetAllContracts")]
        [Authorize]
        public async Task<IActionResult> GetAllContracts()
        {
            try
            {
                var contracts = await _contractService.GetAllContractsAsync();
                return Ok(contracts);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving contracts: {ex.Message}");
            }
        }

        [HttpGet("/GetContractsByOwnerId/{ownerId}")]
        [Authorize]
        public async Task<IActionResult> GetContractsByOwnerId(int ownerId)
        {
            try
            {
                var contracts = await _contractService.GetContractsByOwnerIdAsync(ownerId);
                return Ok(contracts);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving contracts: {ex.Message}");
            }
        }

        [HttpGet("/GetContractById/{id}")]
        [Authorize]
        public async Task<IActionResult> GetContractById(int id)
        {
            try
            {
                var contract = await _contractService.GetContractByIdAsync(id);
                return Ok(contract);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving contract: {ex.Message}");
            }
        }

        [HttpPost("/CreateContract")]
        [Authorize]
        public async Task<IActionResult> CreateContract([FromBody] CreateContractDto dto)
        {
            try
            {
                var contract = await _contractService.CreateContractAsync(dto);
                return Ok(contract);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error creating contract: {ex.Message}");
            }
        }

        [HttpPut("/UpdateContract")]
        [Authorize]
        public async Task<IActionResult> UpdateContract([FromBody] UpdateContractDto dto)
        {
            try
            {
                var contract = await _contractService.UpdateContractAsync(dto);
                return Ok(contract);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error updating contract: {ex.Message}");
            }
        }

        [HttpDelete("/DeleteContract/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteContract(int id)
        {
            try
            {
                await _contractService.DeleteContractAsync(id);
                return Ok("Contract deleted successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error deleting contract: {ex.Message}");
            }
        }

        [HttpGet("/GetContractsByTenantId/{tenantId}")]
        [Authorize]
        public async Task<IActionResult> GetContractsByTenantId(int tenantId)
        {
            try
            {
                var contracts = await _contractService.GetContractsByTenantIdAsync(tenantId);
                return Ok(contracts);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving contracts: {ex.Message}");
            }
        }

        [HttpPut("/AcknowledgeContract/{id}")]
        [Authorize]
        public async Task<IActionResult> AcknowledgeContract(int id)
        {
            try
            {
                var contract = await _contractService.AcknowledgeContractAsync(id);
                return Ok(contract);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error acknowledging contract: {ex.Message}");
            }
        }
    }
}
