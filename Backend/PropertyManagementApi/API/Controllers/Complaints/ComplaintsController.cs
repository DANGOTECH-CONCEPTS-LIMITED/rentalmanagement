using Application.Interfaces.Complaints;
using Domain.Dtos.TenantComplaints;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel;

namespace API.Controllers.Complaints
{
    [Route("api/[controller]")]
    [ApiController]
    public class ComplaintsController : ControllerBase
    {
        private readonly IComplaintService _complaintService;

        public ComplaintsController(IComplaintService complaintService)
        {
            _complaintService = complaintService;
        }

        [HttpPost("/LogTenantComplaint")]
        [Description("Log a tenant complaint")]
        [Authorize]
        public async Task<IActionResult> LogTenantComplaint([FromForm] List<IFormFile> file, [FromForm] ComplaintDto complaint)
        {
            try
            {
                //check if file is null or empty
                if (file == null || file.Count == 0)
                {
                    //pass an empty file
                    file = new List<IFormFile> { new FormFile(Stream.Null, 0, 0, "", "") };
                }
                await _complaintService.LogTenantComplaint(file[0], complaint);
                return Ok("Complaint logged successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error logging complaint: {ex.Message}");
            }
        }

        [HttpGet("/GetTenantComplaintsByPropertyId/{propertyId}")]
        [Description("Get tenant complaints by property ID")]
        [Authorize]
        public async Task<IActionResult> GetTenantComplaintsByPropertyId(int propertyId)
        {
            try
            {
                var complaints = await _complaintService.GetTenantComplaintsByPropertyId(propertyId);
                return Ok(complaints);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving complaints: {ex.Message}");
            }
        }

        [HttpGet("/GetTenantComplaintById/{id}")]
        [Description("Get tenant complaint by ID")]
        [Authorize]
        public async Task<IActionResult> GetTenantComplaintById(int id)
        {
            try
            {
                var complaint = await _complaintService.GetTenantComplaintById(id);
                return Ok(complaint);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving complaint: {ex.Message}");
            }
        }

        [HttpPut("/UpdateTenantComplaint/{id}")]
        [Description("Updates tenant complaint")]
        [Authorize]
        public async Task<IActionResult> UpdateTenantComplaint(int id, [FromBody] ComplaintDto complaint)
        {
            try
            {
                await _complaintService.UpdateTenantComplaint(id, complaint);
                return Ok("Complaint updated successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error updating complaint: {ex.Message}");
            }
        }

        [HttpDelete("/DeleteTenantComplaint/{id}")]
        [Description("Delete tenant complaint")]
        [Authorize]
        public async Task<IActionResult> DeleteTenantComplaint(int id)
        {
            try
            {
                await _complaintService.DeleteTenantComplaint(id);
                return Ok("Complaint deleted successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error deleting complaint: {ex.Message}");
            }
        }

        [HttpGet("/GetComplaintsByTenantId/{tenantId}")]
        [Description("Get complaints by tenant ID")]
        [Authorize]
        public async Task<IActionResult> GetComplaintsByTenantId(int tenantId)
        {
            try
            {
                var complaints = await _complaintService.GetComplaintsByTenantId(tenantId);
                return Ok(complaints);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving complaints: {ex.Message}");
            }
        }

        [HttpGet("/GetAllTenantComplaints")]
        [Description("Get all tenant complaints")]
        [Authorize]
        public async Task<IActionResult> GetAllTenantComplaints()
        {
            try
            {
                var complaints = await _complaintService.GetAllTenantComplaints();
                return Ok(complaints);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving complaints: {ex.Message}");
            }
        }

        [HttpGet("/GetAllTenantComplaintsByLandlordId/{landlordId}")]
        [Description("Get all tenant complaints by landlord ID")]
        [Authorize]
        public async Task<IActionResult> GetAllTenantComplaintsByLandlordId(int landlordId)
        {
            try
            {
                var complaints = await _complaintService.GetAllTenantComplaintsByLandlordId(landlordId);
                return Ok(complaints);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving complaints: {ex.Message}");
            }
        }
    }
}
