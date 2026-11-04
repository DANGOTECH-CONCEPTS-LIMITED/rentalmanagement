using Application.Interfaces.Tenant;
using Domain.Dtos.Tenant;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Tenant
{
    public class ArrearsPaymentPlanService : IArrearsPaymentPlanService
    {
        private readonly AppDbContext _context;

        public ArrearsPaymentPlanService(AppDbContext context)
        {
            _context = context;
        }

        private IQueryable<ArrearsPaymentPlan> BaseQuery() => _context.ArrearsPaymentPlans.AsNoTracking()
            .Include(p => p.Tenant)
                .ThenInclude(t => t.Property);

        public async Task<IEnumerable<ArrearsPaymentPlan>> GetByTenantIdAsync(int tenantId, CancellationToken ct = default)
        {
            return await BaseQuery().Where(p => p.TenantId == tenantId).OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
        }

        public async Task<IEnumerable<ArrearsPaymentPlan>> GetByLandlordIdAsync(int landlordId, CancellationToken ct = default)
        {
            return await BaseQuery()
                .Where(p => p.Tenant.Property.OwnerId == landlordId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<ArrearsPaymentPlan> CreateAsync(ArrearsPaymentPlanDto dto, CancellationToken ct = default)
        {
            if (dto.TotalAmount <= 0) throw new ArgumentException("Total amount must be positive.");
            if (dto.InstallmentAmount <= 0) throw new ArgumentException("Installment amount must be positive.");
            if (dto.TotalInstallments <= 0) throw new ArgumentException("Total installments must be positive.");

            var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == dto.TenantId, ct)
                ?? throw new ArgumentException("Tenant not found.");

            var plan = new ArrearsPaymentPlan
            {
                TenantId = dto.TenantId,
                TotalAmount = dto.TotalAmount,
                InstallmentAmount = dto.InstallmentAmount,
                TotalInstallments = dto.TotalInstallments,
                PaidInstallments = 0
            };
            _context.ArrearsPaymentPlans.Add(plan);
            await _context.SaveChangesAsync(ct);
            return plan;
        }

        public async Task<ArrearsPaymentPlan> CancelAsync(int id, CancellationToken ct = default)
        {
            var plan = await _context.ArrearsPaymentPlans.FirstOrDefaultAsync(p => p.Id == id, ct)
                ?? throw new KeyNotFoundException("Payment plan not found.");
            if (plan.Status != "ACTIVE")
                throw new InvalidOperationException("Only active payment plans can be cancelled.");
            plan.Status = "CANCELLED";
            await _context.SaveChangesAsync(ct);
            return plan;
        }
    }
}
