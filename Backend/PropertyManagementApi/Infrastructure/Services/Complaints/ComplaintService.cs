using Application.Interfaces.Complaints;
using Application.Interfaces.Settings;
using Domain.Dtos.TenantComplaints;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Services.Complaints
{
    public class ComplaintService : IComplaintService
    {
        private readonly AppDbContext _context;
        private readonly ISettings _settings;

        public ComplaintService(AppDbContext context, ISettings settings)
        {
            _context = context;
            _settings = settings;
        }

        public async Task DeleteTenantComplaint(int complaintId)
        {
            var complaint = await _context.TenantComplaints.FirstOrDefaultAsync(c => c.Id == complaintId);
            if (complaint != null)
            {
                _context.TenantComplaints.Remove(complaint);
                _context.SaveChanges();
            }
        }

        public Task<IEnumerable<Complaint>> GetAllTenantComplaints()
        {
            return Task.FromResult(_context.TenantComplaints
                .Include(c => c.Property)
                   .ThenInclude(p => p.Owner)
                .ToList()
                .AsEnumerable());
        }

        public async Task<IEnumerable<Complaint>> GetAllTenantComplaintsByLandlordId(int landlordId)
        {
            return await _context.TenantComplaints
                .Include(c => c.Property)
                .Where(c => c.Property.OwnerId == landlordId).ToListAsync();
        }

        public async Task<IEnumerable<Complaint>> GetComplaintsByTenantId(int tenantId)
        {
            return await _context.TenantComplaints
                .Include(c => c.Property)
                .Join(_context.Tenants, c => c.PropertyId, t => t.PropertyId, (c, t) => new { Complaint = c, Tenant = t })
                .Where(x => x.Tenant.Id == tenantId).Select(x => x.Complaint)
                .ToListAsync();
        }

        public async Task<Complaint> GetTenantComplaintById(int complaintId)
        {
            var complaint = await _context.TenantComplaints
                .Include(c => c.Property)
                  .ThenInclude(p => p.Owner)
                .FirstOrDefaultAsync(c => c.Id == complaintId);

            return complaint;
        }

        public async Task<IEnumerable<Complaint>> GetTenantComplaintsByPropertyId(int propertyId)
        {
            return await _context.TenantComplaints
                .Include(c => c.Property)
                  .ThenInclude(p => p.Owner)
                .Where(c => c.PropertyId == propertyId)
                .ToListAsync();
        }

        public async Task LogTenantComplaint(IFormFile file, ComplaintDto complaint)
        {
            //check whether property exists
            var property = await _context.LandLordProperties.FirstOrDefaultAsync(p => p.Id == complaint.PropertyId);
            if (property == null)
            {
                throw new Exception("Property does not exist");
            }

            //create a new complaint
            var newcomplaint = new Complaint 
            {
                Subject = complaint.Subject,
                Description = complaint.Description,
                Priority = complaint.Priority,
                Attachement = file != null ? await _settings.SaveFileAndReturnPathAsync(file) : "",
                Status = "PENDING",
                PropertyId = complaint.PropertyId,
            };
        }

        public async Task UpdateTenantComplaint(int complaintId, ComplaintDto complaint)
        {
            var existingComplaint = await _context.TenantComplaints.FirstOrDefaultAsync(c => c.Id == complaintId);
            if (existingComplaint != null)
            {
                existingComplaint.Subject = complaint.Subject;
                existingComplaint.Description = complaint.Description;
                existingComplaint.Priority = complaint.Priority;
                existingComplaint.Status = complaint.Status;
                existingComplaint.ResolutionDetails = complaint.ResolutionDetails;
                _context.SaveChanges();
            }
        }
    }
}
