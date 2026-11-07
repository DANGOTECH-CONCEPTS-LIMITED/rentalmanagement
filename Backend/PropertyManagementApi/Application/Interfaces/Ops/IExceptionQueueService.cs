using Domain.Dtos.Ops;

namespace Application.Interfaces.Ops;

public interface IExceptionQueueService
{
    /// <summary>
    /// Returns records that need manual attention: failed or stuck bill payments, and collections
    /// that were never credited or never billed.
    /// </summary>
    /// <param name="category">A member of <see cref="ExceptionCategories"/>, or null/"all" for every category.</param>
    Task<ExceptionQueueResult> GetAsync(string? category, int page, int pageSize, CancellationToken ct = default);
}
