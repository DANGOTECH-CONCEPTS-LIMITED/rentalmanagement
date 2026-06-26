using System.Collections.Generic;

namespace Domain.Dtos.User
{
    public class CaretakerPropertyAssignmentDto
    {
        public int CaretakerId { get; set; }
        public List<int> PropertyIds { get; set; } = [];
    }
}