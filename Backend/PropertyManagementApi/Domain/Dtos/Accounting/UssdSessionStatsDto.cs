using System;
using System.Collections.Generic;

namespace Domain.Dtos.Accounting
{
    public class UssdSessionStatsDto
    {
        public int Total { get; set; }
        public int Success { get; set; }
        public int Failed { get; set; }
        public int Incomplete { get; set; }
        public int Cancelled { get; set; }
        public double? AvgDurationSeconds { get; set; }
        public UssdFunnelDto Funnel { get; set; } = new();
        public List<UssdSessionDailyDto> Daily { get; set; } = new();
    }

    public class UssdFunnelDto
    {
        /// <summary>Sessions that reached the menu at all (i.e. have an end event).</summary>
        public int Started { get; set; }

        /// <summary>Sessions that captured a meter number.</summary>
        public int ReachedMeter { get; set; }

        /// <summary>Sessions that captured a payment amount.</summary>
        public int ReachedAmount { get; set; }

        /// <summary>Sessions that completed checkout successfully.</summary>
        public int Completed { get; set; }
    }

    public class UssdSessionDailyDto
    {
        public DateTime Date { get; set; }
        public int Total { get; set; }
        public int Success { get; set; }
    }
}
