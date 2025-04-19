using Domain.Dtos.TenantComplaints;
using Domain.Entities;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.Complaints
{
    public interface IComplaintService
    {
        Task LogTenantComplaint(IFormFile file,ComplaintDto complaint);
        Task<IEnumerable<Complaint>> GetTenantComplaintsByPropertyId(int propertyId);
        Task<Complaint> GetTenantComplaintById(int complaintId);
        Task UpdateTenantComplaint(int complaintId, ComplaintDto complaint);
        Task DeleteTenantComplaint(int complaintId);
        Task<IEnumerable<Complaint>> GetComplaintsByTenantId(int tenantId);
        Task<IEnumerable<Complaint>> GetAllTenantComplaints();
        Task<IEnumerable<Complaint>> GetAllTenantComplaintsByLandlordId(int landlordId);
    }
}
