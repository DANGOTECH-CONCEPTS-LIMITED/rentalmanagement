namespace Domain.Dtos.Property
{
    public record PropertyOccupancyDto(int PropertyId, string Name, int NumberOfRooms, int ActiveTenants, bool Occupied);
}
