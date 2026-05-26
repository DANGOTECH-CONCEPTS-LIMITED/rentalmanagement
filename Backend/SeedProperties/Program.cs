using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Infrastructure.Data;
using Domain.Entities.PropertyMgt;
using Domain.Entities.Accounting;
using Domain.Entities.AuditTrail;
using Domain.Enums.Accounting;
using Microsoft.AspNetCore.Identity;

namespace SeedProperties
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("=== Property, Image & Utility Transaction Seed Script ===\n");

            // Build configuration (reads appsettings.json from the API project)
            var basePath = Path.Combine(Directory.GetCurrentDirectory(), "..", "PropertyManagementApi", "API");
            var config = new ConfigurationBuilder()
                .SetBasePath(basePath)
                .AddJsonFile("appsettings.json", optional: false)
                .Build();

            var connectionString = config.GetConnectionString("DefaultConnection");
            Console.WriteLine($"Connection string: {connectionString}\n");

            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 28)))
                .Options;

            await using var db = new AppDbContext(options);

            // ── 1. Ensure a Landlord user exists ──────────────────────────────
            var landlordRole = await db.SystemRoles.FirstOrDefaultAsync(r => r.Name == "Landlord");
            if (landlordRole == null)
            {
                Console.WriteLine("ERROR: 'Landlord' role not found in database. Run migrations first.");
                return;
            }

            var hasher = new PasswordHasher<User>();
            var landlord = await db.Users.FirstOrDefaultAsync(u => u.SystemRoleId == landlordRole.Id);

            if (landlord == null)
            {
                Console.WriteLine("No landlord user found. Creating one...");
                landlord = new User
                {
                    FullName = "Default Landlord",
                    Email = "landlord@marpleproperties.com",
                    PhoneNumber = "+256700000000",
                    Password = hasher.HashPassword(null!, "Landlord@123"),
                    Active = true,
                    PasswordChanged = false,
                    Verified = true,
                    SystemRoleId = landlordRole.Id,
                    PassportPhoto = "",
                    IdFront = "",
                    IdBack = "",
                    NationalIdNumber = "N/A",
                    UtilityChargeType = "Percentage",
                    UtilityChargePercentage = 10.0
                };
                db.Users.Add(landlord);
                await db.SaveChangesAsync();
                Console.WriteLine($"Created landlord user with Id = {landlord.Id}\n");
            }
            else
            {
                Console.WriteLine($"Found existing landlord user: {landlord.FullName} (Id = {landlord.Id})\n");
            }

            // ── 2. Collect image files from the uploads folder ────────────────
            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "..", "PropertyManagementApi", "API", "uploads");
            if (!Directory.Exists(uploadsDir))
            {
                Console.WriteLine($"ERROR: Uploads directory not found at: {uploadsDir}");
                return;
            }

            var imageExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
            var imageFiles = Directory.GetFiles(uploadsDir)
                .Where(f => imageExtensions.Contains(Path.GetExtension(f).ToLower()))
                .ToList();

            Console.WriteLine($"Found {imageFiles.Count} image file(s) in uploads folder.\n");

            if (imageFiles.Count == 0)
            {
                Console.WriteLine("No images found. Exiting.");
                return;
            }

            // ── 3. Seed properties ────────────────────────────────────────────
            var propertiesToSeed = new List<(string Name, string Type, string Address, string Region, string District, string Zipcode, string Description, int Rooms, double Price, string Currency)>
            {
                (
                    Name: "Sunset Apartments",
                    Type: "Apartment",
                    Address: "Plot 12, Kampala Road",
                    Region: "Central",
                    District: "Kampala",
                    Zipcode: "P.O. Box 1234",
                    Description: "Modern 2-bedroom apartment with stunning city views, fully furnished with modern amenities including a gym and swimming pool.",
                    Rooms: 2,
                    Price: 850000,
                    Currency: "UGX"
                ),
                (
                    Name: "Riverside Villas",
                    Type: "Villa",
                    Address: "Plot 45, Lake Victoria Road",
                    Region: "Central",
                    District: "Wakiso",
                    Zipcode: "P.O. Box 5678",
                    Description: "Spacious 4-bedroom villa overlooking the Nile with private garden, secure parking, and 24/7 security.",
                    Rooms: 4,
                    Price: 2500000,
                    Currency: "UGX"
                ),
                (
                    Name: "City Center Studio",
                    Type: "Studio",
                    Address: "Plot 8, Nakasero Hill",
                    Region: "Central",
                    District: "Kampala",
                    Zipcode: "P.O. Box 9012",
                    Description: "Cozy studio apartment in the heart of Kampala, walking distance to major offices and shopping centers.",
                    Rooms: 1,
                    Price: 450000,
                    Currency: "UGX"
                ),
                (
                    Name: "Greenwood Estate",
                    Type: "House",
                    Address: "Plot 22, Muyenga Road",
                    Region: "Central",
                    District: "Kampala",
                    Zipcode: "P.O. Box 3456",
                    Description: "Beautiful 3-bedroom family home in a quiet gated community with a large backyard and modern kitchen.",
                    Rooms: 3,
                    Price: 1800000,
                    Currency: "UGX"
                ),
                (
                    Name: "Hillside Duplex",
                    Type: "Duplex",
                    Address: "Plot 77, Kololo Hill",
                    Region: "Central",
                    District: "Kampala",
                    Zipcode: "P.O. Box 7890",
                    Description: "Elegant duplex with 3 bedrooms, servant quarters, and a rooftop terrace offering panoramic views of the city.",
                    Rooms: 3,
                    Price: 3200000,
                    Currency: "UGX"
                ),
                (
                    Name: "Lakeside Bungalow",
                    Type: "Bungalow",
                    Address: "Plot 33, Entebbe Road",
                    Region: "Central",
                    District: "Wakiso",
                    Zipcode: "P.O. Box 2345",
                    Description: "Charming single-story bungalow near the lake with a spacious veranda, fruit trees, and a borehole.",
                    Rooms: 3,
                    Price: 1500000,
                    Currency: "UGX"
                ),
                (
                    Name: "Metro Heights",
                    Type: "Apartment",
                    Address: "Plot 5, Jinja Road",
                    Region: "Central",
                    District: "Kampala",
                    Zipcode: "P.O. Box 6789",
                    Description: "Contemporary 1-bedroom apartment in a high-rise building with elevator, CCTV, and backup generator.",
                    Rooms: 1,
                    Price: 600000,
                    Currency: "UGX"
                ),
                (
                    Name: "Oakwood Mansion",
                    Type: "Mansion",
                    Address: "Plot 99, Naguru Hill",
                    Region: "Central",
                    District: "Kampala",
                    Zipcode: "P.O. Box 4321",
                    Description: "Luxurious 5-bedroom mansion with a home theater, wine cellar, indoor pool, and staff quarters.",
                    Rooms: 5,
                    Price: 5500000,
                    Currency: "UGX"
                )
            };

            // Shuffle image files so each property gets a random image
            var rng = new Random();
            var shuffledImages = imageFiles.OrderBy(_ => rng.Next()).ToList();

            var seededPropertyIds = new List<int>();
            int seededCount = 0;
            for (int i = 0; i < propertiesToSeed.Count; i++)
            {
                var prop = propertiesToSeed[i];
                var imageFile = shuffledImages[i % shuffledImages.Count];
                var imageFileName = Path.GetFileName(imageFile);

                var exists = await db.LandLordProperties.AnyAsync(p => p.Name == prop.Name);
                if (exists)
                {
                    Console.WriteLine($"  [SKIP] '{prop.Name}' already exists.");
                    var existing = await db.LandLordProperties.FirstAsync(p => p.Name == prop.Name);
                    seededPropertyIds.Add(existing.Id);
                    continue;
                }

                var newProperty = new LandLordProperty
                {
                    Name = prop.Name,
                    Type = prop.Type,
                    Address = prop.Address,
                    Region = prop.Region,
                    District = prop.District,
                    Zipcode = prop.Zipcode,
                    Description = prop.Description,
                    NumberOfRooms = prop.Rooms,
                    Price = prop.Price,
                    Currency = prop.Currency,
                    ImageUrl = imageFileName,
                    OwnerId = landlord.Id,
                    CreatedAt = DateTime.UtcNow
                };

                db.LandLordProperties.Add(newProperty);
                seededCount++;
                Console.WriteLine($"  [ADD]  '{prop.Name}' ({prop.Type}, {prop.Rooms} rooms, {prop.Currency} {prop.Price:N0}) → {imageFileName}");
            }

            await db.SaveChangesAsync();

            // Collect all property IDs (newly seeded + pre-existing)
            if (seededPropertyIds.Count == 0)
            {
                seededPropertyIds = await db.LandLordProperties.Select(p => p.Id).ToListAsync();
            }
            else
            {
                var allIds = await db.LandLordProperties.Select(p => p.Id).ToListAsync();
                foreach (var id in allIds)
                    if (!seededPropertyIds.Contains(id)) seededPropertyIds.Add(id);
            }

            Console.WriteLine($"\nProperties in scope: {seededPropertyIds.Count}\n");

            // ── 4. Seed Utility Meters ────────────────────────────────────────
            var metersToSeed = new List<(string MeterType, string MeterNumber, string? NWSCAccount, string? Location, int LandLordId)>
            {
                ("Electricity", "EM-001-2024", null,  "Sunset Apartments, Plot 12 Kampala Road", landlord.Id),
                ("Water",     "WM-001-2024", "NWSC-1001", "Sunset Apartments, Plot 12 Kampala Road", landlord.Id),
                ("Electricity", "EM-002-2024", null,  "Riverside Villas, Plot 45 Lake Victoria Road", landlord.Id),
                ("Water",     "WM-002-2024", "NWSC-1002", "Riverside Villas, Plot 45 Lake Victoria Road", landlord.Id),
                ("Electricity", "EM-003-2024", null,  "City Center Studio, Plot 8 Nakasero Hill", landlord.Id),
                ("Water",     "WM-003-2024", "NWSC-1003", "City Center Studio, Plot 8 Nakasero Hill", landlord.Id),
                ("Electricity", "EM-004-2024", null,  "Greenwood Estate, Plot 22 Muyenga Road", landlord.Id),
                ("Water",     "WM-004-2024", "NWSC-1004", "Greenwood Estate, Plot 22 Muyenga Road", landlord.Id),
                ("Electricity", "EM-005-2024", null,  "Hillside Duplex, Plot 77 Kololo Hill", landlord.Id),
                ("Water",     "WM-005-2024", "NWSC-1005", "Hillside Duplex, Plot 77 Kololo Hill", landlord.Id),
                ("Electricity", "EM-006-2024", null,  "Lakeside Bungalow, Plot 33 Entebbe Road", landlord.Id),
                ("Water",     "WM-006-2024", "NWSC-1006", "Lakeside Bungalow, Plot 33 Entebbe Road", landlord.Id),
                ("Electricity", "EM-007-2024", null,  "Metro Heights, Plot 5 Jinja Road", landlord.Id),
                ("Water",     "WM-007-2024", "NWSC-1007", "Metro Heights, Plot 5 Jinja Road", landlord.Id),
                ("Electricity", "EM-008-2024", null,  "Oakwood Mansion, Plot 99 Naguru Hill", landlord.Id),
                ("Water",     "WM-008-2024", "NWSC-1008", "Oakwood Mansion, Plot 99 Naguru Hill", landlord.Id),
            };

            var seededMeterIds = new List<int>();
            int metersSeeded = 0;
            foreach (var m in metersToSeed)
            {
                var exists = await db.UtilityMeters.AnyAsync(x => x.MeterNumber == m.MeterNumber);
                if (exists)
                {
                    Console.WriteLine($"  [SKIP] Meter '{m.MeterNumber}' already exists.");
                    var existing = await db.UtilityMeters.FirstAsync(x => x.MeterNumber == m.MeterNumber);
                    seededMeterIds.Add(existing.Id);
                    continue;
                }

                var meter = new UtilityMeter
                {
                    MeterType = m.MeterType,
                    MeterNumber = m.MeterNumber,
                    NWSCAccount = m.NWSCAccount,
                    LocationOfNwscMeter = m.Location,
                    LandLordId = m.LandLordId,
                    DateCreated = DateTime.UtcNow.AddDays(-rng.Next(30, 180))
                };
                db.UtilityMeters.Add(meter);
                seededMeterIds.Add(meter.Id);
                metersSeeded++;
                Console.WriteLine($"  [ADD]  Meter '{m.MeterNumber}' ({m.MeterType}) → {m.Location}");
            }

            await db.SaveChangesAsync();
            Console.WriteLine($"\nMeters seeded: {metersSeeded} (total in DB: {await db.UtilityMeters.CountAsync()})\n");

            // ── 5. Seed Utility Transactions (payments) ───────────────────────
            var now = DateTime.UtcNow;
            var transactionsToSeed = new List<(string Description, string TransactionID, string PhoneNumber, string MeterNumber, string UtilityType, string Status, string PaymentMethod, string? Vendor, string? VendorTranId, double Amount, double Charges, DateTime CreatedAt, bool IsTokenGenerated, string? Token, string? Units, bool IsSmsSent, string? ReasonAtTelecom)>
            {
                // ── Sunset Apartments ──
                ("Electricity bill payment - March 2024",  "TXN-EL-001", "+256701000001", "EM-001-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-001", 185000.0, 3500.0,  now.AddDays(-90),  true,  "TOKEN-EL-001-A1B2", "125.5",  true,  null),
                ("Water bill payment - March 2024",        "TXN-WT-001", "+256701000001", "WM-001-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-001",  45000.0,  2000.0,  now.AddDays(-88),  false, null,               "32.0",   true,  null),
                ("Electricity bill payment - April 2024",  "TXN-EL-002", "+256701000001", "EM-001-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-002", 172000.0, 3500.0,  now.AddDays(-60),  true,  "TOKEN-EL-002-C3D4", "118.0",  true,  null),
                ("Water bill payment - April 2024",        "TXN-WT-002", "+256701000001", "WM-001-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-002",  52000.0,  2000.0,  now.AddDays(-58),  false, null,               "37.5",   true,  null),
                ("Electricity bill payment - May 2024",    "TXN-EL-003", "+256701000001", "EM-001-2024", "Electricity", "Completed", "Cash",        "UMEME",   "VT-EL-003", 198000.0, 3500.0,  now.AddDays(-30),  true,  "TOKEN-EL-003-E5F6", "135.2",  false, null),

                // ── Riverside Villas ──
                ("Electricity bill payment - March 2024",  "TXN-EL-004", "+256702000002", "EM-002-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-004", 420000.0, 5000.0,  now.AddDays(-89),  true,  "TOKEN-EL-004-G7H8", "290.0",  true,  null),
                ("Water bill payment - March 2024",        "TXN-WT-004", "+256702000002", "WM-002-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-004",  95000.0,  3500.0,  now.AddDays(-87),  false, null,               "68.0",   true,  null),
                ("Electricity bill payment - April 2024",  "TXN-EL-005", "+256702000002", "EM-002-2024", "Electricity", "Completed", "BankTransfer","UMEME",   "VT-EL-005", 385000.0, 5000.0,  now.AddDays(-59),  true,  "TOKEN-EL-005-I9J0", "265.5",  true,  null),
                ("Water bill payment - April 2024",        "TXN-WT-005", "+256702000002", "WM-002-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-005",  88000.0,  3500.0,  now.AddDays(-57),  false, null,               "62.5",   true,  null),
                ("Electricity bill payment - May 2024",    "TXN-EL-006", "+256702000002", "EM-002-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-006", 510000.0, 5000.0,  now.AddDays(-28),  true,  "TOKEN-EL-006-K1L2", "350.0",  true,  null),

                // ── City Center Studio ──
                ("Electricity bill payment - March 2024",  "TXN-EL-007", "+256703000003", "EM-003-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-007",  95000.0, 2000.0,  now.AddDays(-91),  true,  "TOKEN-EL-007-M3N4", "65.0",   true,  null),
                ("Water bill payment - March 2024",        "TXN-WT-007", "+256703000003", "WM-003-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-007",  28000.0, 1500.0,  now.AddDays(-89),  false, null,               "20.0",   true,  null),
                ("Electricity bill payment - April 2024",  "TXN-EL-008", "+256703000003", "EM-003-2024", "Electricity", "Completed", "Cash",        "UMEME",   "VT-EL-008",  88000.0, 2000.0,  now.AddDays(-61),  true,  "TOKEN-EL-008-O5P6", "60.5",   false, null),
                ("Water bill payment - April 2024",        "TXN-WT-008", "+256703000003", "WM-003-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-008",  31000.0, 1500.0,  now.AddDays(-59),  false, null,               "22.0",   true,  null),
                ("Electricity bill payment - May 2024",    "TXN-EL-009", "+256703000003", "EM-003-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-009", 102000.0, 2000.0,  now.AddDays(-29),  true,  "TOKEN-EL-009-Q7R8", "70.0",   true,  null),

                // ── Greenwood Estate ──
                ("Electricity bill payment - March 2024",  "TXN-EL-010", "+256704000004", "EM-004-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-010", 245000.0, 4000.0,  now.AddDays(-92),  true,  "TOKEN-EL-010-S9T0", "170.0",  true,  null),
                ("Water bill payment - March 2024",        "TXN-WT-010", "+256704000004", "WM-004-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-010",  68000.0, 3000.0,  now.AddDays(-90),  false, null,               "48.5",   true,  null),
                ("Electricity bill payment - April 2024",  "TXN-EL-011", "+256704000004", "EM-004-2024", "Electricity", "Completed", "BankTransfer","UMEME",   "VT-EL-011", 230000.0, 4000.0,  now.AddDays(-62),  true,  "TOKEN-EL-011-U1V2", "160.0",  true,  null),
                ("Water bill payment - April 2024",        "TXN-WT-011", "+256704000004", "WM-004-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-011",  72000.0, 3000.0,  now.AddDays(-60),  false, null,               "51.0",   true,  null),
                ("Electricity bill payment - May 2024",    "TXN-EL-012", "+256704000004", "EM-004-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-012", 268000.0, 4000.0,  now.AddDays(-31),  true,  "TOKEN-EL-012-W3X4", "185.5",  true,  null),

                // ── Hillside Duplex ──
                ("Electricity bill payment - March 2024",  "TXN-EL-013", "+256705000005", "EM-005-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-013", 310000.0, 4500.0,  now.AddDays(-93),  true,  "TOKEN-EL-013-Y5Z6", "215.0",  true,  null),
                ("Water bill payment - March 2024",        "TXN-WT-013", "+256705000005", "WM-005-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-013",  82000.0, 3500.0,  now.AddDays(-91),  false, null,               "58.0",   true,  null),
                ("Electricity bill payment - April 2024",  "TXN-EL-014", "+256705000005", "EM-005-2024", "Electricity", "Completed", "Cash",        "UMEME",   "VT-EL-014", 295000.0, 4500.0,  now.AddDays(-63),  true,  "TOKEN-EL-014-A7B8", "205.0",  false, null),
                ("Water bill payment - April 2024",        "TXN-WT-014", "+256705000005", "WM-005-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-014",  78000.0, 3500.0,  now.AddDays(-61),  false, null,               "55.5",   true,  null),
                ("Electricity bill payment - May 2024",    "TXN-EL-015", "+256705000005", "EM-005-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-015", 340000.0, 4500.0,  now.AddDays(-27),  true,  "TOKEN-EL-015-C9D0", "235.0",  true,  null),

                // ── Lakeside Bungalow ──
                ("Electricity bill payment - March 2024",  "TXN-EL-016", "+256706000006", "EM-006-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-016", 165000.0, 3500.0,  now.AddDays(-94),  true,  "TOKEN-EL-016-E1F2", "115.0",  true,  null),
                ("Water bill payment - March 2024",        "TXN-WT-016", "+256706000006", "WM-006-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-016",  55000.0, 2500.0,  now.AddDays(-92),  false, null,               "39.0",   true,  null),
                ("Electricity bill payment - April 2024",  "TXN-EL-017", "+256706000006", "EM-006-2024", "Electricity", "Completed", "BankTransfer","UMEME",   "VT-EL-017", 150000.0, 3500.0,  now.AddDays(-64),  true,  "TOKEN-EL-017-G3H4", "105.0",  true,  null),
                ("Water bill payment - April 2024",        "TXN-WT-017", "+256706000006", "WM-006-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-017",  62000.0, 2500.0,  now.AddDays(-62),  false, null,               "44.0",   true,  null),
                ("Electricity bill payment - May 2024",    "TXN-EL-018", "+256706000006", "EM-006-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-018", 178000.0, 3500.0,  now.AddDays(-26),  true,  "TOKEN-EL-018-I5J6", "123.0",  true,  null),

                // ── Metro Heights ──
                ("Electricity bill payment - March 2024",  "TXN-EL-019", "+256707000007", "EM-007-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-019",  78000.0, 2000.0,  now.AddDays(-95),  true,  "TOKEN-EL-019-K7L8", "54.0",   true,  null),
                ("Water bill payment - March 2024",        "TXN-WT-019", "+256707000007", "WM-007-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-019",  22000.0, 1500.0,  now.AddDays(-93),  false, null,               "16.0",   true,  null),
                ("Electricity bill payment - April 2024",  "TXN-EL-020", "+256707000007", "EM-007-2024", "Electricity", "Completed", "Cash",        "UMEME",   "VT-EL-020",  72000.0, 2000.0,  now.AddDays(-65),  true,  "TOKEN-EL-020-M9N0", "50.0",   false, null),
                ("Water bill payment - April 2024",        "TXN-WT-020", "+256707000007", "WM-007-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-020",  25000.0, 1500.0,  now.AddDays(-63),  false, null,               "18.0",   true,  null),
                ("Electricity bill payment - May 2024",    "TXN-EL-021", "+256707000007", "EM-007-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-021",  85000.0, 2000.0,  now.AddDays(-25),  true,  "TOKEN-EL-021-O1P2", "59.0",   true,  null),

                // ── Oakwood Mansion ──
                ("Electricity bill payment - March 2024",  "TXN-EL-022", "+256708000008", "EM-008-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-022", 580000.0, 6000.0,  now.AddDays(-96),  true,  "TOKEN-EL-022-Q3R4", "400.0",  true,  null),
                ("Water bill payment - March 2024",        "TXN-WT-022", "+256708000008", "WM-008-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-022", 145000.0, 4000.0,  now.AddDays(-94),  false, null,               "103.0",  true,  null),
                ("Electricity bill payment - April 2024",  "TXN-EL-023", "+256708000008", "EM-008-2024", "Electricity", "Completed", "BankTransfer","UMEME",   "VT-EL-023", 540000.0, 6000.0,  now.AddDays(-66),  true,  "TOKEN-EL-023-S5T6", "375.0",  true,  null),
                ("Water bill payment - April 2024",        "TXN-WT-023", "+256708000008", "WM-008-2024", "Water",     "Completed", "MobileMoney", "NWSC",     "VT-WT-023", 138000.0, 4000.0,  now.AddDays(-64),  false, null,               "98.5",   true,  null),
                ("Electricity bill payment - May 2024",    "TXN-EL-024", "+256708000008", "EM-008-2024", "Electricity", "Completed", "MobileMoney", "UMEME",   "VT-EL-024", 620000.0, 6000.0,  now.AddDays(-24),  true,  "TOKEN-EL-024-U7V8", "430.0",  true,  null),

                // ── Some pending / failed transactions ──
                ("Electricity bill payment - May 2024",    "TXN-EL-025", "+256701000001", "EM-001-2024", "Electricity", "Pending",   "MobileMoney", "UMEME",   "VT-EL-025", 210000.0, 3500.0,  now.AddDays(-5),   false, null,               "0.0",    false, "Insufficient balance"),
                ("Water bill payment - May 2024",          "TXN-WT-025", "+256702000002", "WM-002-2024", "Water",     "Failed",    "MobileMoney", "NWSC",     "VT-WT-025",  95000.0, 3500.0,  now.AddDays(-4),   false, null,               "0.0",    false, "Insufficient balance"),

                // ── Ann — meter wm-0324 (Sunset Apartments · A2) ──
                ("Water bill payment - February 2026",     "TXN-WM0324-001", "+256700000100", "wm-0324", "Water", "Completed", "MobileMoney", "NWSC", "VT-WM0324-001",  38000.0, 1500.0,  now.AddDays(-115), false, null, "27.0",  true,  null),
                ("Water bill payment - March 2026",        "TXN-WM0324-002", "+256700000100", "wm-0324", "Water", "Completed", "MobileMoney", "NWSC", "VT-WM0324-002",  42000.0, 1500.0,  now.AddDays(-85),  false, null, "30.0",  true,  null),
                ("Water bill payment - March 2026 (2)",   "TXN-WM0324-003", "+256700000100", "wm-0324", "Water", "Completed", "Cash",        "NWSC", "VT-WM0324-003",  15000.0,  500.0,  now.AddDays(-70),  false, null, "10.5",  false, null),
                ("Water bill payment - April 2026",        "TXN-WM0324-004", "+256700000100", "wm-0324", "Water", "Completed", "MobileMoney", "NWSC", "VT-WM0324-004",  45000.0, 1500.0,  now.AddDays(-55),  false, null, "32.0",  true,  null),
                ("Water bill payment - April 2026 (2)",   "TXN-WM0324-005", "+256700000100", "wm-0324", "Water", "Completed", "MobileMoney", "NWSC", "VT-WM0324-005",  20000.0,  800.0,  now.AddDays(-40),  false, null, "14.0",  true,  null),
                ("Water bill payment - May 2026",          "TXN-WM0324-006", "+256700000100", "wm-0324", "Water", "Completed", "MobileMoney", "NWSC", "VT-WM0324-006",  50000.0, 1500.0,  now.AddDays(-18),  false, null, "35.5",  true,  null),
                ("Water bill payment - May 2026 (pending)","TXN-WM0324-007", "+256700000100", "wm-0324", "Water", "Pending",   "MobileMoney", "NWSC", "VT-WM0324-007",  48000.0, 1500.0,  now.AddDays(-3),   false, null, "0.0",   false, null),
            };

            int txSeeded = 0;
            foreach (var t in transactionsToSeed)
            {
                var exists = await db.UtilityPayments.AnyAsync(x => x.TransactionID == t.TransactionID);
                if (exists)
                {
                    Console.WriteLine($"  [SKIP] Transaction '{t.TransactionID}' already exists.");
                    continue;
                }

                var payment = new UtilityPayment
                {
                    Description = t.Description,
                    TransactionID = t.TransactionID,
                    PhoneNumber = t.PhoneNumber,
                    MeterNumber = t.MeterNumber,
                    UtilityType = t.UtilityType,
                    Status = t.Status,
                    PaymentMethod = t.PaymentMethod,
                    Vendor = t.Vendor,
                    VendorTranId = t.VendorTranId,
                    Amount = t.Amount,
                    Charges = t.Charges,
                    CreatedAt = t.CreatedAt,
                    IsTokenGenerated = t.IsTokenGenerated,
                    Token = t.Token,
                    Units = t.Units,
                    IsSmsSent = t.IsSmsSent,
                    VendorPaymentDate = t.CreatedAt,
                    UtilityAccountNumber = t.UtilityType == "Water" ? $"NWSC-{t.MeterNumber[3..]}" : null,
                    ReasonAtTelecom = t.ReasonAtTelecom
                };

                db.UtilityPayments.Add(payment);
                txSeeded++;
                Console.WriteLine($"  [ADD]  {t.TransactionID} | {t.UtilityType,-10} | {t.Status,-8} | {t.PhoneNumber} | {t.MeterNumber} | UGX {t.Amount:N0}");
            }

            await db.SaveChangesAsync();

            Console.WriteLine($"\n=== Seed Complete ===");
            Console.WriteLine($"Properties seeded    : {seededCount}  (total in DB: {await db.LandLordProperties.CountAsync()})");
            Console.WriteLine($"Meters seeded        : {metersSeeded}  (total in DB: {await db.UtilityMeters.CountAsync()})");
            Console.WriteLine($"Transactions seeded  : {txSeeded}  (total in DB: {await db.UtilityPayments.CountAsync()})");

            // ── 6. Seed Property Units (Rooms) ─────────────────────────────────
            // Load all properties to map names → IDs
            var allProperties = await db.LandLordProperties.ToListAsync();
            var propertyIdMap = allProperties.ToDictionary(p => p.Name, p => p.Id);

            // Check existing unit numbers per property to avoid duplicates
            var existingUnitKeys = await db.PropertyUnits
                .Select(u => new { u.PropertyId, u.UnitNumber })
                .ToListAsync();
            var existingUnitSet = new HashSet<string>(
                existingUnitKeys.Select(k => $"{k.PropertyId}:{k.UnitNumber}"));

            var unitsToSeed = new List<(string PropertyName, string UnitNumber, double SecurityDeposit, double MonthlyAmount, string Status)>
            {
                // ── Sunset Apartments (2 rooms) ──
                ("Sunset Apartments", "1A", 850000, 850000, "Occupied"),
                ("Sunset Apartments", "1B", 850000, 850000, "Available"),

                // ── Riverside Villas (4 rooms) ──
                ("Riverside Villas", "2A", 2500000, 2500000, "Occupied"),
                ("Riverside Villas", "2B", 2500000, 2500000, "Occupied"),
                ("Riverside Villas", "2C", 2500000, 2500000, "Available"),
                ("Riverside Villas", "2D", 2500000, 2500000, "Available"),

                // ── City Center Studio (1 room) ──
                ("City Center Studio", "3A", 450000, 450000, "Occupied"),

                // ── Greenwood Estate (3 rooms) ──
                ("Greenwood Estate", "4A", 1800000, 1800000, "Occupied"),
                ("Greenwood Estate", "4B", 1800000, 1800000, "Available"),
                ("Greenwood Estate", "4C", 1800000, 1800000, "Available"),

                // ── Hillside Duplex (3 rooms) ──
                ("Hillside Duplex", "5A", 3200000, 3200000, "Occupied"),
                ("Hillside Duplex", "5B", 3200000, 3200000, "Available"),
                ("Hillside Duplex", "5C", 3200000, 3200000, "Available"),

                // ── Lakeside Bungalow (3 rooms) ──
                ("Lakeside Bungalow", "6A", 1500000, 1500000, "Occupied"),
                ("Lakeside Bungalow", "6B", 1500000, 1500000, "Available"),
                ("Lakeside Bungalow", "6C", 1500000, 1500000, "Available"),

                // ── Metro Heights (1 room) ──
                ("Metro Heights", "7A", 600000, 600000, "Occupied"),

                // ── Oakwood Mansion (5 rooms) ──
                ("Oakwood Mansion", "8A", 5500000, 5500000, "Occupied"),
                ("Oakwood Mansion", "8B", 5500000, 5500000, "Occupied"),
                ("Oakwood Mansion", "8C", 5500000, 5500000, "Available"),
                ("Oakwood Mansion", "8D", 5500000, 5500000, "Available"),
                ("Oakwood Mansion", "8E", 5500000, 5500000, "Available"),
            };

            int unitsSeeded = 0;
            foreach (var u in unitsToSeed)
            {
                if (!propertyIdMap.TryGetValue(u.PropertyName, out var propId))
                {
                    Console.WriteLine($"  [WARN] Property '{u.PropertyName}' not found, skipping unit {u.UnitNumber}.");
                    continue;
                }

                var key = $"{propId}:{u.UnitNumber}";
                if (existingUnitSet.Contains(key))
                {
                    Console.WriteLine($"  [SKIP] Unit '{u.UnitNumber}' at '{u.PropertyName}' already exists.");
                    continue;
                }

                db.PropertyUnits.Add(new PropertyUnit
                {
                    PropertyId = propId,
                    UnitNumber = u.UnitNumber,
                    SecurityDeposit = u.SecurityDeposit,
                    MonthlyAmount = u.MonthlyAmount,
                    Status = u.Status,
                    CreatedAt = DateTime.UtcNow
                });
                unitsSeeded++;
                Console.WriteLine($"  [ADD]  {u.PropertyName,-22} | Unit {u.UnitNumber,-4} | {u.Status,-9} | Deposit: UGX {u.SecurityDeposit:N0} | Rent: UGX {u.MonthlyAmount:N0}");
            }

            await db.SaveChangesAsync();
            Console.WriteLine($"\nProperty units seeded  : {unitsSeeded}  (total in DB: {await db.PropertyUnits.CountAsync()})");

            // Occupancy summary
            var totalUnits = await db.PropertyUnits.CountAsync();
            var occupiedUnits = await db.PropertyUnits.CountAsync(u => u.Status == "Occupied");
            var availableUnits = await db.PropertyUnits.CountAsync(u => u.Status == "Available");
            var occupancyPct = totalUnits > 0 ? (double)occupiedUnits / totalUnits * 100 : 0;
            Console.WriteLine($"\n── Occupancy Summary ──");
            Console.WriteLine($"  Total    : {totalUnits}");
            Console.WriteLine($"  Occupied : {occupiedUnits}");
            Console.WriteLine($"  Available: {availableUnits}");
            Console.WriteLine($"  Occupancy: {occupancyPct:F1}%");

            // ── 7. Seed Tenants ───────────────────────────────────────────────
            // Build lookup: property name + unit number → unit id
            var unitLookup = await db.PropertyUnits
                .Include(u => u.Property)
                .ToListAsync();

            var unitKeyMap = unitLookup
                .Where(u => u.Property != null)
                .ToDictionary(u => $"{u.Property!.Name}|{u.UnitNumber}", u => u);

            var occupiedUnitsList = unitLookup
                .Where(u => u.Status == "Occupied")
                .ToList();

            var tenantsToSeed = new List<(string FullName, string Email, string PhoneNumber, string NationalIdNumber, string Occupation, string NextOfKinName, string NextOfKinPhone, string WaterMeterNo, string PaymentStatus, double BalanceDue, double Arrears, string PropertyName, string UnitNumber)>
            {
                ("Nakato Sarah",        "nakato.sarah@gmail.com",       "+256701000101", "CM1234567890", "Software Engineer",  "Mukasa John",     "+256701000102", "WM-001-2024", "Paid",    0,   0,  "Sunset Apartments",  "1A"),
                ("Mukasa David",        "david.mukasa@yahoo.com",       "+256701000201", "CM2345678901", "Businessman",        "Nakato Grace",    "+256701000202", "WM-002-2024", "Paid",    0,   0,  "Riverside Villas",   "2A"),
                ("Namuli Patricia",     "patricia.namuli@outlook.com",  "+256701000301", "CM3456789012", "Teacher",            "Ssemanda Peter",  "+256701000302", "WM-002-2024", "Overdue", 150000, 150000, "Riverside Villas",   "2B"),
                ("Ssemanda James",      "james.ssemanda@gmail.com",     "+256701000401", "CM4567890123", "Accountant",         "Nambi Sarah",     "+256701000402", "WM-003-2024", "Paid",    0,   0,  "City Center Studio", "3A"),
                ("Nambi Elizabeth",     "elizabeth.nambi@yahoo.com",    "+256701000501", "CM5678901234", "Doctor",             "Kato Michael",    "+256701000502", "WM-004-2024", "Paid",    0,   0,  "Greenwood Estate",   "4A"),
                ("Kato Robert",         "robert.kato@gmail.com",        "+256701000601", "CM6789012345", "Architect",          "Auma Betty",      "+256701000602", "WM-005-2024", "Overdue", 320000, 640000, "Hillside Duplex",    "5A"),
                ("Auma Florence",       "florence.auma@outlook.com",    "+256701000701", "CM7890123456", "Nurse",              "Ouma Daniel",     "+256701000702", "WM-006-2024", "Paid",    0,   0,  "Lakeside Bungalow",  "6A"),
                ("Ouma Brian",          "brian.ouma@gmail.com",         "+256701000801", "CM8901234567", "Marketing Manager",  "Nakimuli Ruth",   "+256701000802", "WM-007-2024", "Paid",    0,   0,  "Metro Heights",      "7A"),
                ("Nakimuli Victoria",   "victoria.nakimuli@yahoo.com",  "+256701000901", "CM9012345678", "Lawyer",             "Wasswa Samuel",   "+256701000902", "WM-008-2024", "Paid",    0,   0,  "Oakwood Mansion",    "8A"),
                ("Wasswa Charles",      "charles.wasswa@gmail.com",     "+256701001001", "CM0123456789", "Engineer",           "Nakato Sarah",    "+256701001002", "WM-008-2024", "Overdue", 550000, 550000, "Oakwood Mansion",    "8B"),
            };

            int tenantsSeeded = 0;
            foreach (var t in tenantsToSeed)
            {
                var exists = await db.Tenants.AnyAsync(x => x.Email == t.Email);
                if (exists)
                {
                    Console.WriteLine($"  [SKIP] Tenant '{t.FullName}' ({t.Email}) already exists.");
                    continue;
                }

                var unitKey = $"{t.PropertyName}|{t.UnitNumber}";
                if (!unitKeyMap.TryGetValue(unitKey, out var unit))
                {
                    Console.WriteLine($"  [WARN] Unit '{t.UnitNumber}' at '{t.PropertyName}' not found, skipping tenant {t.FullName}.");
                    continue;
                }

                db.Tenants.Add(new PropertyTenant
                {
                    FullName = t.FullName,
                    Email = t.Email,
                    PhoneNumber = t.PhoneNumber,
                    NationalIdNumber = t.NationalIdNumber,
                    Occupation = t.Occupation,
                    NextOfKinName = t.NextOfKinName,
                    NextOfKinPhone = t.NextOfKinPhone,
                    WaterMeterNo = t.WaterMeterNo,
                    PaymentStatus = t.PaymentStatus,
                    BalanceDue = t.BalanceDue,
                    Arrears = t.Arrears,
                    NextPaymentDate = DateTime.UtcNow.AddDays(30),
                    DateMovedIn = DateTime.UtcNow.AddDays(-rng.Next(30, 365)),
                    PropertyId = unit.PropertyId,
                    PropertyUnitId = unit.Id,
                    Active = true,
                    PassportPhoto = "",
                    IdFront = "",
                    IdBack = "",
                    Property = null  // prevent EF from inserting a new LandLordProperty (the class initializer sets it to new())
                });
                tenantsSeeded++;
                Console.WriteLine($"  [ADD]  {t.FullName,-22} | {t.Email,-35} | {t.Occupation,-18} | {t.PaymentStatus,-7} | Unit {unit.UnitNumber} @ {unit.Property?.Name}");
            }

            await db.SaveChangesAsync();
            Console.WriteLine($"\nTenants seeded       : {tenantsSeeded}  (total in DB: {await db.Tenants.CountAsync()})");

            // ── 8. Seed Rental Contracts ─────────────────────────────────────
            var seededTenants = await db.Tenants.ToListAsync();
            var tenantByEmail = seededTenants.ToDictionary(t => t.Email, t => t);

            var contractsToSeed = new List<(string ContractNumber, string TenantEmail, string PropertyName, string UnitNumber, DateTime StartDate, DateTime EndDate, double RentAmount, double SecurityDeposit, string Status, string? Terms, int OwnerId, int? PropertyId, int? UnitId, int? TenantId)>
            {
                ("CNT-2024-001", "nakato.sarah@gmail.com",       "Sunset Apartments",   "1A", new DateTime(2024, 1, 1),  new DateTime(2024, 12, 31), 850000,  850000,  "active",   "Standard 12-month lease agreement.", 1, 1, 1, 0),
                ("CNT-2024-002", "david.mukasa@yahoo.com",       "Riverside Villas",    "2A", new DateTime(2024, 2, 1),  new DateTime(2025, 1, 31), 2500000, 2500000, "active",   "Standard 12-month lease agreement.", 1, 2, 3, 0),
                ("CNT-2024-003", "patricia.namuli@outlook.com",  "Riverside Villas",    "2B", new DateTime(2024, 3, 1),  new DateTime(2025, 2, 28), 2500000, 2500000, "active",   "Standard 12-month lease agreement.", 1, 2, 4, 0),
                ("CNT-2024-004", "james.ssemanda@gmail.com",     "City Center Studio",  "3A", new DateTime(2024, 1, 15, 0, 0, 0, DateTimeKind.Utc), new DateTime(2024, 12, 14, 0, 0, 0, DateTimeKind.Utc), 450000, 450000, "active",   "Standard 12-month lease agreement.", 1, 3, 7, 0),
                ("CNT-2024-005", "elizabeth.nambi@yahoo.com",    "Greenwood Estate",    "4A", new DateTime(2024, 4, 1, 0, 0, 0, DateTimeKind.Utc), new DateTime(2025, 3, 31, 0, 0, 0, DateTimeKind.Utc), 1800000, 1800000, "active",   "Standard 12-month lease agreement.", 1, 4, 8, 0),
                ("CNT-2024-006", "robert.kato@gmail.com",        "Hillside Duplex",     "5A", new DateTime(2023, 6, 1, 0, 0, 0, DateTimeKind.Utc), new DateTime(2024, 5, 31, 0, 0, 0, DateTimeKind.Utc), 3200000, 3200000, "expired",  "Standard 12-month lease agreement.", 1, 5, 11, 0),
                ("CNT-2024-007", "florence.auma@outlook.com",    "Lakeside Bungalow",   "6A", new DateTime(2024, 5, 1, 0, 0, 0, DateTimeKind.Utc), new DateTime(2025, 4, 30, 0, 0, 0, DateTimeKind.Utc), 1500000, 1500000, "active",   "Standard 12-month lease agreement.", 1, 6, 14, 0),
                ("CNT-2024-008", "brian.ouma@gmail.com",         "Metro Heights",       "7A", new DateTime(2024, 3, 1, 0, 0, 0, DateTimeKind.Utc), new DateTime(2025, 2, 28, 0, 0, 0, DateTimeKind.Utc), 600000,  600000,  "active",   "Standard 12-month lease agreement.", 1, 7, 17, 0),
                ("CNT-2024-009", "victoria.nakimuli@yahoo.com",  "Oakwood Mansion",     "8A", new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), new DateTime(2024, 12, 31, 0, 0, 0, DateTimeKind.Utc), 5500000, 5500000, "active",   "Standard 12-month lease agreement.", 1, 8, 18, 0),
                ("CNT-2024-010", "charles.wasswa@gmail.com",     "Oakwood Mansion",     "8B", new DateTime(2024, 2, 15, 0, 0, 0, DateTimeKind.Utc), new DateTime(2025, 2, 14, 0, 0, 0, DateTimeKind.Utc), 5500000, 5500000, "active",   "Standard 12-month lease agreement.", 1, 8, 19, 0),
                ("CNT-2024-011", "susan.ateka@gmail.com",        "Sunset Apartments",   "1B", new DateTime(2024, 6, 1, 0, 0, 0, DateTimeKind.Utc), new DateTime(2025, 5, 31, 0, 0, 0, DateTimeKind.Utc), 850000,  850000,  "pending",  "Pending tenant move-in.", 1, 1, 0, 0),
                ("CNT-2024-012", "peter.sserwadda@outlook.com",  "Greenwood Estate",    "4B", new DateTime(2024, 7, 1, 0, 0, 0, DateTimeKind.Utc), new DateTime(2025, 6, 30, 0, 0, 0, DateTimeKind.Utc), 1800000, 1800000, "pending",  "Pending tenant move-in.", 1, 4, 0, 0),
            };

            int contractsSeeded = 0;
            foreach (var c in contractsToSeed)
            {
                var exists = await db.RentalContracts.AnyAsync(x => x.ContractNumber == c.ContractNumber);
                if (exists)
                {
                    Console.WriteLine($"  [SKIP] Contract '{c.ContractNumber}' already exists.");
                    continue;
                }

                // Resolve tenant id from email
                int? resolvedTenantId = null;
                if (c.TenantEmail != "susan.ateka@gmail.com" && c.TenantEmail != "peter.sserwadda@outlook.com")
                {
                    if (tenantByEmail.TryGetValue(c.TenantEmail, out var tenant))
                        resolvedTenantId = tenant.Id;
                }

                db.RentalContracts.Add(new RentalContract
                {
                    ContractNumber = c.ContractNumber,
                    TenantName = c.TenantEmail == "susan.ateka@gmail.com" ? "Ateka Susan" :
                                 c.TenantEmail == "peter.sserwadda@outlook.com" ? "Sserwadda Peter" :
                                 tenantByEmail[c.TenantEmail].FullName,
                    TenantEmail = c.TenantEmail,
                    TenantPhone = c.TenantEmail == "susan.ateka@gmail.com" ? "+256701001101" :
                                  c.TenantEmail == "peter.sserwadda@outlook.com" ? "+256701001201" :
                                  tenantByEmail[c.TenantEmail].PhoneNumber,
                    PropertyName = c.PropertyName,
                    UnitName = c.UnitNumber,
                    StartDate = c.StartDate,
                    EndDate = c.EndDate,
                    RentAmount = c.RentAmount,
                    Currency = "UGX",
                    SecurityDeposit = c.SecurityDeposit,
                    Status = c.Status,
                    Terms = c.Terms,
                    OwnerId = c.OwnerId,
                    PropertyId = c.PropertyId,
                    UnitId = c.UnitId,
                    TenantId = resolvedTenantId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
                contractsSeeded++;
                Console.WriteLine($"  [ADD]  {c.ContractNumber} | {c.PropertyName,-22} Unit {c.UnitNumber} | {c.Status,-8} | UGX {c.RentAmount:N0}/mo | {c.StartDate:yyyy-MM-dd} → {c.EndDate:yyyy-MM-dd}");
            }

            await db.SaveChangesAsync();
            Console.WriteLine($"\nContracts seeded     : {contractsSeeded}  (total in DB: {await db.RentalContracts.CountAsync()})");

            // ── 9. Seed Admin User ────────────────────────────────────────────
            var adminRole = await db.SystemRoles.FirstOrDefaultAsync(r => r.Name == "Administrator");
            if (adminRole == null)
            {
                Console.WriteLine("\nERROR: 'Administrator' role not found.");
            }
            else
            {
                var adminEmail = "admin@marpleproperties.com";
                var adminUser = await db.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);

                if (adminUser == null)
                {
                    adminUser = new User
                    {
                        FullName = "System Administrator",
                        Email = adminEmail,
                        PhoneNumber = "+256700000001",
                        Password = hasher.HashPassword(null!, "Admin@Secure123"),
                        Active = true,
                        PasswordChanged = false,
                        Verified = true,
                        SystemRoleId = adminRole.Id,
                        PassportPhoto = "",
                        IdFront = "",
                        IdBack = "",
                        NationalIdNumber = "N/A",
                        UtilityChargeType = "Percentage",
                        UtilityChargePercentage = 10.0
                    };
                    db.Users.Add(adminUser);
                    await db.SaveChangesAsync();
                    Console.WriteLine($"\n[ADD]  Admin user created: {adminUser.FullName} ({adminUser.Email}) — Id = {adminUser.Id}");
                }
                else
                {
                    Console.WriteLine($"\n[SKIP] Admin user already exists: {adminUser.FullName} ({adminUser.Email}) — Id = {adminUser.Id}");
                }

                // ── 7. Seed HTTP Request/Response Logs ─────────────────────────
                var httpLogsToSeed = new List<(string? Request, string? Response, string? Status, string? ErrorMessage, string? RequestType, string? RequestUrl)>
                {
                    (
                        Request: "POST /api/Property/AddProperty\nContent-Type: multipart/form-data",
                        Response: "{\"message\":\"Property added successfully.\"}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "multipart/form-data",
                        RequestUrl: "https://api.marpleproperties.com/api/Property/AddProperty"
                    ),
                    (
                        Request: "GET /api/Property/GetAllProperties\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIs...",
                        Response: "[{\"id\":1,\"name\":\"Sunset Apartments\",\"type\":\"Apartment\",...}]",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Property/GetAllProperties"
                    ),
                    (
                        Request: "GET /api/Property/GetPropertyById/1\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIs...",
                        Response: "{\"id\":1,\"name\":\"Sunset Apartments\",\"type\":\"Apartment\",\"address\":\"Plot 12, Kampala Road\",...}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Property/GetPropertyById/1"
                    ),
                    (
                        Request: "PUT /api/Property/UpdateProperty\nContent-Type: multipart/form-data",
                        Response: "{\"message\":\"Property updated successfully.\"}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "multipart/form-data",
                        RequestUrl: "https://api.marpleproperties.com/api/Property/UpdateProperty"
                    ),
                    (
                        Request: "DELETE /api/Property/DeleteProperty/3\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIs...",
                        Response: "{\"message\":\"Property deleted successfully.\"}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Property/DeleteProperty/3"
                    ),
                    (
                        Request: "POST /api/Tenant/AddTenant\nContent-Type: application/json\n{\"fullName\":\"John Doe\",\"email\":\"john@example.com\",...}",
                        Response: "{\"message\":\"Tenant added successfully.\",\"tenantId\":5}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Tenant/AddTenant"
                    ),
                    (
                        Request: "GET /api/Tenant/GetAllTenants\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIs...",
                        Response: "[{\"id\":1,\"fullName\":\"Jane Smith\",\"email\":\"jane@example.com\",\"phoneNumber\":\"+256701234567\",...}]",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Tenant/GetAllTenants"
                    ),
                    (
                        Request: "POST /api/Payments/MakePayment\nContent-Type: application/json\n{\"tenantId\":1,\"amount\":850000,\"paymentMethod\":\"MobileMoney\",...}",
                        Response: "{\"message\":\"Payment recorded successfully.\",\"transactionId\":\"TXN-20240520-001\"}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Payments/MakePayment"
                    ),
                    (
                        Request: "POST /api/CollectoApi/RequestToPay\nContent-Type: application/json\n{\"phoneNumber\":\"+256701000001\",\"amount\":185000,...}",
                        Response: "{\"status\":\"Pending\",\"transactionId\":\"COLL-20240520-001\",\"message\":\"Payment request initiated.\"}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://collecto.cissytech.com/api/dangotech/requesttopay"
                    ),
                    (
                        Request: "GET /api/UtilityMeter/GetMetersByLandLordId/1\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIs...",
                        Response: "[{\"id\":1,\"meterNumber\":\"EM-001-2024\",\"meterType\":\"Electricity\",\"nwscAccount\":null,...}]",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/UtilityMeter/GetMetersByLandLordId/1"
                    ),
                    (
                        Request: "POST /api/UtilityPayment/RecordPayment\nContent-Type: application/json\n{\"meterNumber\":\"EM-001-2024\",\"amount\":185000,\"paymentMethod\":\"MobileMoney\",...}",
                        Response: "{\"message\":\"Utility payment recorded.\",\"paymentId\":12}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/UtilityPayment/RecordPayment"
                    ),
                    (
                        Request: "GET /api/Contract/GetContractsByLandLordId/1\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIs...",
                        Response: "[{\"id\":1,\"contractNumber\":\"CNT-2024-001\",\"tenantName\":\"John Doe\",\"propertyName\":\"Sunset Apartments\",...}]",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Contract/GetContractsByLandLordId/1"
                    ),
                    (
                        Request: "POST /api/Contract/CreateContract\nContent-Type: application/json\n{\"tenantId\":1,\"propertyId\":1,\"unitId\":2,\"startDate\":\"2024-01-01\",...}",
                        Response: "{\"message\":\"Contract created successfully.\",\"contractId\":3,\"contractNumber\":\"CNT-2024-003\"}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Contract/CreateContract"
                    ),
                    (
                        Request: "GET /api/Accounts/GetBalance\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIs...",
                        Response: "{\"balance\":\"5,250,000.00\",\"currency\":\"UGX\",\"lastUpdated\":\"2024-05-20T10:30:00Z\"}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Accounts/GetBalance"
                    ),
                    (
                        Request: "POST /api/Accounts/PostJournal\nContent-Type: application/json\n{\"description\":\"Rent payment for Unit 2A\",\"debit\":850000,\"credit\":850000,...}",
                        Response: "{\"message\":\"Journal entry posted.\",\"journalId\":45}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Accounts/PostJournal"
                    ),
                    (
                        Request: "GET /api/Complaints/GetComplaintsByPropertyId/1\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIs...",
                        Response: "[{\"id\":1,\"subject\":\"Leaking tap\",\"status\":\"Resolved\",\"priority\":\"Medium\",...}]",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Complaints/GetComplaintsByPropertyId/1"
                    ),
                    (
                        Request: "POST /api/Complaints/SubmitComplaint\nContent-Type: application/json\n{\"propertyId\":1,\"subject\":\"Power outage\",\"description\":\"No electricity since morning\",...}",
                        Response: "{\"message\":\"Complaint submitted.\",\"complaintId\":8}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Complaints/SubmitComplaint"
                    ),
                    (
                        Request: "GET /api/ViewingRequest/GetRequestsByPropertyId/1\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIs...",
                        Response: "[{\"id\":1,\"tenantName\":\"Alice Nambi\",\"tenantEmail\":\"alice@example.com\",\"status\":\"Pending\",...}]",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/ViewingRequest/GetRequestsByPropertyId/1"
                    ),
                    (
                        Request: "POST /api/ViewingRequest/CreateRequest\nContent-Type: application/json\n{\"propertyId\":1,\"tenantId\":2,\"preferredDate\":\"2024-06-01\",...}",
                        Response: "{\"message\":\"Viewing request created.\",\"requestId\":5}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/ViewingRequest/CreateRequest"
                    ),
                    (
                        Request: "GET /api/Wallet/GetBalance\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIs...",
                        Response: "{\"balance\":\"3,500,000.00\",\"currency\":\"UGX\"}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Wallet/GetBalance"
                    ),
                    (
                        Request: "POST /api/Wallet/Withdraw\nContent-Type: application/json\n{\"amount\":500000,\"bankAccount\":\"...\",...}",
                        Response: "{\"message\":\"Withdrawal request submitted.\",\"reference\":\"WTH-20240520-001\"}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Wallet/Withdraw"
                    ),
                    (
                        Request: "GET /api/Health/Version",
                        Response: "{\"version\":\"1.0.0\",\"environment\":\"Production\",\"timestamp\":\"2024-05-20T08:00:00Z\"}",
                        Status: "200 OK",
                        ErrorMessage: null,
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Health/Version"
                    ),
                    (
                        Request: "GET /api/Property/GetPropertiesByLandLordId/1\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIs...",
                        Response: "{\"message\":\"No properties found for this landlord.\"}",
                        Status: "400 Bad Request",
                        ErrorMessage: "No properties found for this landlord.",
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Property/GetPropertiesByLandLordId/99"
                    ),
                    (
                        Request: "POST /api/Payments/MakePayment\nContent-Type: application/json\n{\"tenantId\":1,\"amount\":-50000,...}",
                        Response: "{\"message\":\"Invalid amount.\"}",
                        Status: "400 Bad Request",
                        ErrorMessage: "Payment amount must be greater than zero.",
                        RequestType: "application/json",
                        RequestUrl: "https://api.marpleproperties.com/api/Payments/MakePayment"
                    ),
                };

                int httpLogsSeeded = 0;
                foreach (var log in httpLogsToSeed)
                {
                    var exists = await db.HttpRequesRequestResponses.AnyAsync(x => x.RequestUrl == log.RequestUrl && x.RequestType == log.RequestType);
                    if (exists)
                    {
                        Console.WriteLine($"  [SKIP] HTTP log for '{log.RequestUrl}' already exists.");
                        continue;
                    }

                    db.HttpRequesRequestResponses.Add(new HttpRequesRequestResponse
                    {
                        Request = log.Request,
                        Response = log.Response,
                        Status = log.Status,
                        ErrorMessage = log.ErrorMessage,
                        RequestType = log.RequestType,
                        RequestUrl = log.RequestUrl,
                        CreatedAt = DateTime.UtcNow.AddDays(-rng.Next(1, 90))
                    });
                    httpLogsSeeded++;
                    Console.WriteLine($"  [ADD]  HTTP {log.Status,-9} → {log.RequestUrl}");
                }
                await db.SaveChangesAsync();
                Console.WriteLine($"\nHTTP logs seeded     : {httpLogsSeeded}  (total in DB: {await db.HttpRequesRequestResponses.CountAsync()})");

                // ── 8. Seed Audit Trail Entries ────────────────────────────────
                var auditEntriesToSeed = new List<(string UserId, string? UserName, string? UserRole, string HttpMethod, string Route, string Action, string? RequestData, string? ResultStatus, string? SourceIp, string? Description)>
                {
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "POST", "/api/Property/AddProperty",       "PropertyController.AddProperty",       "{\"name\":\"Sunset Apartments\"}", "200", "192.168.1.100", "Added new property"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "GET",  "/api/Property/GetAllProperties",   "PropertyController.GetAllProperties",  null,                          "200", "192.168.1.100", "Retrieved all properties"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "GET",  "/api/Property/GetPropertyById/1",  "PropertyController.GetPropertyById",    null,                          "200", "192.168.1.100", "Retrieved property details"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "PUT",  "/api/Property/UpdateProperty",     "PropertyController.UpdateProperty",     "{\"id\":1,\"price\":900000}",  "200", "192.168.1.100", "Updated property price"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "DELETE","/api/Property/DeleteProperty/3",   "PropertyController.DeleteProperty",     "{\"id\":3}",                   "200", "192.168.1.100", "Deleted property"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "POST", "/api/Tenant/AddTenant",            "TenantController.AddTenant",            "{\"fullName\":\"John Doe\"}",  "200", "192.168.1.100", "Added new tenant"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "GET",  "/api/Tenant/GetAllTenants",        "TenantController.GetAllTenants",        null,                          "200", "192.168.1.100", "Retrieved all tenants"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "POST", "/api/Payments/MakePayment",        "PaymentController.MakePayment",         "{\"tenantId\":1,\"amount\":850000}", "200", "192.168.1.100", "Recorded tenant payment"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "POST", "/api/CollectoApi/RequestToPay",    "CollectoController.RequestToPay",       "{\"phone\":\"+256701000001\"}", "200", "192.168.1.100", "Initiated Collecto payment request"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "GET",  "/api/UtilityMeter/GetMetersByLandLordId/1", "MeterController.GetByLandLordId", null,                          "200", "192.168.1.100", "Retrieved utility meters"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "POST", "/api/UtilityPayment/RecordPayment","UtilityPaymentController.RecordPayment","{\"meterNumber\":\"EM-001-2024\"}", "200", "192.168.1.100", "Recorded utility payment"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "POST", "/api/Contract/CreateContract",     "RentalContractController.CreateContract","{\"tenantId\":1,\"propertyId\":1}", "200", "192.168.1.100", "Created rental contract"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "GET",  "/api/Contract/GetContractsByLandLordId/1", "RentalContractController.GetByLandLordId", null,                   "200", "192.168.1.100", "Retrieved rental contracts"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "POST", "/api/Accounts/PostJournal",        "AccountingController.PostJournal",      "{\"description\":\"Rent payment\"}", "200", "192.168.1.100", "Posted journal entry"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "GET",  "/api/Accounts/GetBalance",         "AccountingController.GetBalance",       null,                          "200", "192.168.1.100", "Retrieved account balance"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "POST", "/api/Complaints/SubmitComplaint",  "ComplaintsController.SubmitComplaint",  "{\"subject\":\"Power outage\"}", "200", "192.168.1.100", "Submitted complaint"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "GET",  "/api/Complaints/GetComplaintsByPropertyId/1", "ComplaintsController.GetByPropertyId", null,                "200", "192.168.1.100", "Retrieved property complaints"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "POST", "/api/ViewingRequest/CreateRequest", "ViewingRequestController.CreateRequest","{\"propertyId\":1,\"tenantId\":2}", "200", "192.168.1.100", "Created viewing request"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "GET",  "/api/ViewingRequest/GetRequestsByPropertyId/1", "ViewingRequestController.GetByPropertyId", null,         "200", "192.168.1.100", "Retrieved viewing requests"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "POST", "/api/Wallet/Withdraw",             "WalletController.Withdraw",             "{\"amount\":500000}",         "200", "192.168.1.100", "Processed wallet withdrawal"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "GET",  "/api/Wallet/GetBalance",           "WalletController.GetBalance",           null,                          "200", "192.168.1.100", "Retrieved wallet balance"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "GET",  "/api/Health/Version",              "VersionController.GetVersion",          null,                          "200", "192.168.1.100", "Health check version endpoint"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "GET",  "/api/Property/GetPropertiesByLandLordId/99", "PropertyController.GetByLandLordId", null,               "400", "192.168.1.100", "Failed: No properties for landlord 99"),
                    (adminUser.Id.ToString(), adminUser.FullName, "Administrator", "POST", "/api/Payments/MakePayment",        "PaymentController.MakePayment",         "{\"amount\":-50000}",        "400", "192.168.1.100", "Failed: Invalid payment amount"),
                    (landlord.Id.ToString(), landlord.FullName,  "Landlord",       "GET",  "/api/Property/GetAllProperties",   "PropertyController.GetAllProperties",   null,                          "200", "10.0.0.55",      "Landlord retrieved all properties"),
                    (landlord.Id.ToString(), landlord.FullName,  "Landlord",       "POST", "/api/Property/AddProperty",        "PropertyController.AddProperty",        "{\"name\":\"New Building\"}", "200", "10.0.0.55",      "Landlord added new property"),
                    (landlord.Id.ToString(), landlord.FullName,  "Landlord",       "GET",  "/api/Contract/GetContractsByLandLordId/1", "RentalContractController.GetByLandLordId", null,           "200", "10.0.0.55",      "Landlord retrieved contracts"),
                };

                int auditSeeded = 0;
                foreach (var entry in auditEntriesToSeed)
                {
                    var exists = await db.AuditTrailEntries.AnyAsync(a =>
                        a.Route == entry.Route && a.HttpMethod == entry.HttpMethod && a.Action == entry.Action);
                    if (exists)
                    {
                        Console.WriteLine($"  [SKIP] Audit entry for '{entry.Route}' already exists.");
                        continue;
                    }

                    db.AuditTrailEntries.Add(new AuditTrailEntry
                    {
                        CreatedAt = DateTime.UtcNow.AddDays(-rng.Next(1, 90)),
                        UserId = entry.UserId,
                        UserName = entry.UserName,
                        UserRole = entry.UserRole,
                        HttpMethod = entry.HttpMethod,
                        Route = entry.Route,
                        Action = entry.Action,
                        RequestData = entry.RequestData,
                        ResultStatus = entry.ResultStatus,
                        SourceIp = entry.SourceIp,
                        Description = entry.Description
                    });
                    auditSeeded++;
                    Console.WriteLine($"  [ADD]  {entry.HttpMethod,-4} {entry.Route,-55} → {entry.ResultStatus} ({entry.UserRole})");
                }
                await db.SaveChangesAsync();
                Console.WriteLine($"\nAudit entries seeded : {auditSeeded}  (total in DB: {await db.AuditTrailEntries.CountAsync()})");
            }

            Console.WriteLine($"\n=== Seed Complete ===");
            Console.WriteLine($"Properties seeded    : {seededCount}  (total in DB: {await db.LandLordProperties.CountAsync()})");
            Console.WriteLine($"Meters seeded        : {metersSeeded}  (total in DB: {await db.UtilityMeters.CountAsync()})");
            Console.WriteLine($"Transactions seeded  : {txSeeded}  (total in DB: {await db.UtilityPayments.CountAsync()})");
            Console.WriteLine($"Users in DB          : {await db.Users.CountAsync()}");
            Console.WriteLine($"HTTP logs in DB      : {await db.HttpRequesRequestResponses.CountAsync()}");
            Console.WriteLine($"Audit entries in DB  : {await db.AuditTrailEntries.CountAsync()}");

            // ── 9. Seed Chart of Accounts ────────────────────────────────────
            var accountsToSeed = new List<(string Code, string Name, AccountType Type, bool IsActive)>
            {
                // Assets
                ("1000", "Cash",                          AccountType.Asset,    true),
                ("1100", "Bank Account",                  AccountType.Asset,    true),
                ("1200", "Accounts Receivable",           AccountType.Asset,    true),
                ("1300", "Prepaid Expenses",              AccountType.Asset,    true),
                // Liabilities
                ("2000", "Wallets Payable",               AccountType.Liability,true),
                ("2100", "Withdrawals Payable (Clearing)",AccountType.Liability,true),
                ("2200", "Tenant Security Deposits",      AccountType.Liability,true),
                ("2300", "Accrued Expenses",              AccountType.Liability,true),
                // Equity
                ("3000", "Owner's Capital",               AccountType.Equity,   true),
                ("3100", "Retained Earnings",             AccountType.Equity,   true),
                // Income
                ("4000", "Rental Income",                 AccountType.Income,   true),
                ("4100", "Commission Income",             AccountType.Income,   true),
                ("4200", "SMS Fee Income",                AccountType.Income,   true),
                ("4300", "Withdrawal Fee Income",         AccountType.Income,   true),
                ("4400", "Late Fee Income",               AccountType.Income,   true),
                // Expenses
                ("5000", "Property Maintenance Expense",  AccountType.Expense,  true),
                ("5100", "PSP Fees Expense",              AccountType.Expense,  true),
                ("5200", "SMS Expense",                   AccountType.Expense,  true),
                ("5300", "USSD Processing Expense",       AccountType.Expense,  true),
                ("5400", "Utility Expense",               AccountType.Expense,  true),
                ("5500", "Staff Salaries Expense",        AccountType.Expense,  true),
                ("5600", "Office & Admin Expense",        AccountType.Expense,  true),
            };

            int accountsSeeded = 0;
            foreach (var a in accountsToSeed)
            {
                var exists = await db.Accounts.AnyAsync(x => x.Code == a.Code);
                if (exists)
                {
                    Console.WriteLine($"  [SKIP] Account '{a.Code} - {a.Name}' already exists.");
                    continue;
                }
                db.Accounts.Add(new Account
                {
                    Code = a.Code,
                    Name = a.Name,
                    Type = a.Type,
                    IsActive = a.IsActive
                });
                accountsSeeded++;
                Console.WriteLine($"  [ADD]  Account {a.Code} | {a.Name,-35} | {a.Type}");
            }
            await db.SaveChangesAsync();
            Console.WriteLine($"\nAccounts seeded      : {accountsSeeded}  (total in DB: {await db.Accounts.CountAsync()})");

            // ── 10. Seed Journal Entries & Lines ─────────────────────────────
            // Build a lookup of account codes → IDs
            var accountLookup = await db.Accounts.ToDictionaryAsync(a => a.Code, a => a.Id);
            int walletId = 1;   // existing wallet id
            int landlordId = landlord.Id;

            var journalEntriesToSeed = new List<(string Description, string CorrelationId, string SourceType, string SourceId, DateTime EntryDate, List<(string AccountCode, decimal Debit, decimal Credit, int? WalletId, int? LandlordId, string? Memo)> Lines)>
            {
                // ── Rent received from tenants ──
                (
                    Description: "Rent received - Sunset Apartments Unit 1A (April 2024)",
                    CorrelationId: "JE-2024-001",
                    SourceType: "RENT_PAYMENT",
                    SourceId: "TXN-RENT-001",
                    EntryDate: new DateTime(2024, 4, 5, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("1000", 850000m, 0,   1, landlordId, "Cash receipt - rent"),
                        ("4000", 0,       850000m, null, null, "Rental income - Sunset Apartments"),
                    }
                ),
                (
                    Description: "Rent received - Riverside Villas Unit 2B (April 2024)",
                    CorrelationId: "JE-2024-002",
                    SourceType: "RENT_PAYMENT",
                    SourceId: "TXN-RENT-002",
                    EntryDate: new DateTime(2024, 4, 7, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("1000", 2500000m, 0,   1, landlordId, "Cash receipt - rent"),
                        ("4000", 0,        2500000m, null, null, "Rental income - Riverside Villas"),
                    }
                ),
                (
                    Description: "Rent received - City Center Studio Unit 3C (April 2024)",
                    CorrelationId: "JE-2024-003",
                    SourceType: "RENT_PAYMENT",
                    SourceId: "TXN-RENT-003",
                    EntryDate: new DateTime(2024, 4, 10, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("1000", 450000m, 0,   1, landlordId, "Cash receipt - rent"),
                        ("4000", 0,       450000m, null, null, "Rental income - City Center Studio"),
                    }
                ),
                (
                    Description: "Rent received - Greenwood Estate Unit 4D (April 2024)",
                    CorrelationId: "JE-2024-004",
                    SourceType: "RENT_PAYMENT",
                    SourceId: "TXN-RENT-004",
                    EntryDate: new DateTime(2024, 4, 12, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("1000", 1800000m, 0,   1, landlordId, "Cash receipt - rent"),
                        ("4000", 0,        1800000m, null, null, "Rental income - Greenwood Estate"),
                    }
                ),
                (
                    Description: "Rent received - Hillside Duplex Unit 5E (April 2024)",
                    CorrelationId: "JE-2024-005",
                    SourceType: "RENT_PAYMENT",
                    SourceId: "TXN-RENT-005",
                    EntryDate: new DateTime(2024, 4, 15, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("1000", 3200000m, 0,   1, landlordId, "Cash receipt - rent"),
                        ("4000", 0,        3200000m, null, null, "Rental income - Hillside Duplex"),
                    }
                ),
                // ── Utility payments (water & electricity) ──
                (
                    Description: "Utility payment - Electricity bill Sunset Apartments (March 2024)",
                    CorrelationId: "JE-2024-006",
                    SourceType: "UTILITY_PAYMENT",
                    SourceId: "TXN-EL-001",
                    EntryDate: new DateTime(2024, 3, 25, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("5400", 185000m, 0,   null, null, "Electricity expense - Sunset Apartments"),
                        ("1000", 0,       185000m, 1, landlordId, "Cash paid - electricity"),
                    }
                ),
                (
                    Description: "Utility payment - Water bill Sunset Apartments (March 2024)",
                    CorrelationId: "JE-2024-007",
                    SourceType: "UTILITY_PAYMENT",
                    SourceId: "TXN-WT-001",
                    EntryDate: new DateTime(2024, 3, 26, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("5400", 45000m, 0,   null, null, "Water expense - Sunset Apartments"),
                        ("1000", 0,       45000m, 1, landlordId, "Cash paid - water"),
                    }
                ),
                (
                    Description: "Utility payment - Electricity bill Riverside Villas (March 2024)",
                    CorrelationId: "JE-2024-008",
                    SourceType: "UTILITY_PAYMENT",
                    SourceId: "TXN-EL-004",
                    EntryDate: new DateTime(2024, 3, 27, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("5400", 420000m, 0,   null, null, "Electricity expense - Riverside Villas"),
                        ("1000", 0,        420000m, 1, landlordId, "Cash paid - electricity"),
                    }
                ),
                (
                    Description: "Utility payment - Water bill Riverside Villas (March 2024)",
                    CorrelationId: "JE-2024-009",
                    SourceType: "UTILITY_PAYMENT",
                    SourceId: "TXN-WT-004",
                    EntryDate: new DateTime(2024, 3, 28, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("5400", 95000m, 0,   null, null, "Water expense - Riverside Villas"),
                        ("1000", 0,       95000m, 1, landlordId, "Cash paid - water"),
                    }
                ),
                // ── Property maintenance expenses ──
                (
                    Description: "Property maintenance - Plumbing repair Sunset Apartments",
                    CorrelationId: "JE-2024-010",
                    SourceType: "EXPENSE",
                    SourceId: "EXP-001",
                    EntryDate: new DateTime(2024, 4, 20, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("5000", 350000m, 0,   null, null, "Plumbing repair - Sunset Apartments"),
                        ("1000", 0,       350000m, 1, landlordId, "Cash paid - maintenance"),
                    }
                ),
                (
                    Description: "Property maintenance - Painting Greenwood Estate",
                    CorrelationId: "JE-2024-011",
                    SourceType: "EXPENSE",
                    SourceId: "EXP-002",
                    EntryDate: new DateTime(2024, 4, 22, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("5000", 500000m, 0,   null, null, "Interior painting - Greenwood Estate"),
                        ("1000", 0,       500000m, 1, landlordId, "Cash paid - painting"),
                    }
                ),
                (
                    Description: "Property maintenance - Electrical repair Hillside Duplex",
                    CorrelationId: "JE-2024-012",
                    SourceType: "EXPENSE",
                    SourceId: "EXP-003",
                    EntryDate: new DateTime(2024, 5, 5, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("5000", 280000m, 0,   null, null, "Electrical repair - Hillside Duplex"),
                        ("1000", 0,       280000m, 1, landlordId, "Cash paid - electrical"),
                    }
                ),
                // ── PSP / SMS / USSD fees ──
                (
                    Description: "PSP fee expense - MobileMoney transaction April 2024",
                    CorrelationId: "JE-2024-013",
                    SourceType: "WALLET_CREDIT",
                    SourceId: "TXN-MM-001",
                    EntryDate: new DateTime(2024, 4, 8, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("5100", 12500m, 0,   1, landlordId, "PSP fee - MobileMoney"),
                        ("1000", 0,       12500m, 1, landlordId, "Cash paid - PSP fee"),
                    }
                ),
                (
                    Description: "SMS fee expense - Tenant notifications April 2024",
                    CorrelationId: "JE-2024-014",
                    SourceType: "WALLET_CREDIT",
                    SourceId: "TXN-SMS-001",
                    EntryDate: new DateTime(2024, 4, 15, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("5200", 7000m, 0,   1, landlordId, "SMS fees - 200 notifications"),
                        ("1000", 0,       7000m, 1, landlordId, "Cash paid - SMS fees"),
                    }
                ),
                (
                    Description: "USSD processing expense - April 2024",
                    CorrelationId: "JE-2024-015",
                    SourceType: "WALLET_WITHDRAW",
                    SourceId: "TXN-USSD-001",
                    EntryDate: new DateTime(2024, 4, 30, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("5300", 5000m, 0,   1, landlordId, "USSD fees - April 2024"),
                        ("1000", 0,       5000m, 1, landlordId, "Cash paid - USSD fees"),
                    }
                ),
                // ── Wallet deposit (with charges) ──
                (
                    Description: "Wallet deposit - Tenant payment via MobileMoney",
                    CorrelationId: "JE-2024-016",
                    SourceType: "WALLET_DEPOSIT",
                    SourceId: "TXN-WALLET-001",
                    EntryDate: new DateTime(2024, 5, 1, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("1000", 765000m, 0,   1, landlordId, "Net cash received"),
                        ("5100", 85000m,  0,   1, landlordId, "PSP fee expense"),
                        ("2000", 0,        850000m, 1, landlordId, "Wallets Payable (gross)"),
                    }
                ),
                // ── Security deposit received ──
                (
                    Description: "Security deposit received - Sunset Apartments Unit 1A",
                    CorrelationId: "JE-2024-017",
                    SourceType: "SECURITY_DEPOSIT",
                    SourceId: "TXN-SD-001",
                    EntryDate: new DateTime(2024, 1, 15, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("1000", 850000m, 0,   1, landlordId, "Security deposit received"),
                        ("2200", 0,        850000m, null, null, "Tenant security deposits liability"),
                    }
                ),
                // ── Late fee income ──
                (
                    Description: "Late fee income - overdue rent City Center Studio",
                    CorrelationId: "JE-2024-018",
                    SourceType: "LATE_FEE",
                    SourceId: "TXN-LF-001",
                    EntryDate: new DateTime(2024, 4, 15, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("1000", 50000m, 0,   1, landlordId, "Late fee received"),
                        ("4400", 0,       50000m, null, null, "Late fee income"),
                    }
                ),
                // ── Staff salaries ──
                (
                    Description: "Staff salaries paid - April 2024",
                    CorrelationId: "JE-2024-019",
                    SourceType: "SALARY_PAYMENT",
                    SourceId: "TXN-SAL-001",
                    EntryDate: new DateTime(2024, 4, 30, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("5500", 1200000m, 0,   null, null, "Staff salaries - April 2024"),
                        ("1000", 0,        1200000m, 1, landlordId, "Cash paid - salaries"),
                    }
                ),
                // ── Office & admin expense ──
                (
                    Description: "Office & admin expenses - April 2024",
                    CorrelationId: "JE-2024-020",
                    SourceType: "EXPENSE",
                    SourceId: "EXP-ADMIN-001",
                    EntryDate: new DateTime(2024, 4, 30, 0, 0, 0, DateTimeKind.Utc),
                    Lines: new()
                    {
                        ("5600", 180000m, 0,   null, null, "Office rent, internet, supplies"),
                        ("1000", 0,       180000m, 1, landlordId, "Cash paid - admin expenses"),
                    }
                ),
            };

            int journalEntriesSeeded = 0;
            int journalLinesSeeded = 0;
            foreach (var je in journalEntriesToSeed)
            {
                var jeExists = await db.JournalEntries.AnyAsync(x => x.CorrelationId == je.CorrelationId);
                if (jeExists)
                {
                    Console.WriteLine($"  [SKIP] Journal entry '{je.CorrelationId}' already exists.");
                    continue;
                }

                var journalEntry = new JournalEntry
                {
                    Description = je.Description,
                    CorrelationId = je.CorrelationId,
                    SourceType = je.SourceType,
                    SourceId = je.SourceId,
                    EntryDate = je.EntryDate,
                    Lines = new List<JournalLine>()
                };

                foreach (var line in je.Lines)
                {
                    if (!accountLookup.TryGetValue(line.AccountCode, out var accountId))
                    {
                        Console.WriteLine($"  [WARN] Account code '{line.AccountCode}' not found, skipping line.");
                        continue;
                    }
                    journalEntry.Lines.Add(new JournalLine
                    {
                        AccountId = accountId,
                        Debit = line.Debit,
                        Credit = line.Credit,
                        WalletId = line.WalletId,
                        LandlordId = line.LandlordId,
                        Memo = line.Memo
                    });
                }

                db.JournalEntries.Add(journalEntry);
                journalEntriesSeeded++;
                journalLinesSeeded += journalEntry.Lines.Count;
                Console.WriteLine($"  [ADD]  {je.CorrelationId} | {je.Description,-55} | {je.EntryDate:yyyy-MM-dd} | {journalEntry.Lines.Count} lines");
            }

            await db.SaveChangesAsync();
            Console.WriteLine($"\nJournal entries seeded : {journalEntriesSeeded}  (total in DB: {await db.JournalEntries.CountAsync()})");
            Console.WriteLine($"Journal lines seeded    : {journalLinesSeeded}  (total in DB: {await db.JournalLines.CountAsync()})");

            // ── 11. Seed Property Expenses ───────────────────────────────────
            var expensesToSeed = new List<(DateTime Date, double Amount, string Category, string PaidBy, string Description, int OwnerId, int? PropertyId, string? ReceiptReference)>
            {
                (new DateTime(2024, 3, 15),  350000,  "Maintenance",  "Kinyeramo", "Plumbing repair - blocked drains at Sunset Apartments", landlord.Id, 1, "RCP-2024-001"),
                (new DateTime(2024, 3, 20),  120000,  "Utilities",    "Kinyeramo", "Electricity bill - common areas March 2024",         landlord.Id, 1, "RCP-2024-002"),
                (new DateTime(2024, 3, 22),  450000,  "Maintenance",  "Kinyeramo", "Interior painting - Riverside Villas",              landlord.Id, 2, "RCP-2024-003"),
                (new DateTime(2024, 3, 25),  95000,   "Utilities",    "Kinyeramo", "Water bill - common areas March 2024",              landlord.Id, 2, "RCP-2024-004"),
                (new DateTime(2024, 4, 5),   280000,  "Maintenance",  "Kinyeramo", "Electrical repair - City Center Studio",            landlord.Id, 3, "RCP-2024-005"),
                (new DateTime(2024, 4, 10),  150000,  "Insurance",    "Kinyeramo", "Property insurance premium - Q2 2024",              landlord.Id, 4, "RCP-2024-006"),
                (new DateTime(2024, 4, 15),  500000,  "Maintenance",  "Kinyeramo", "Roof repair - Greenwood Estate",                    landlord.Id, 4, "RCP-2024-007"),
                (new DateTime(2024, 4, 18),  80000,   "Utilities",    "Kinyeramo", "Water bill - common areas April 2024",              landlord.Id, 4, "RCP-2024-008"),
                (new DateTime(2024, 4, 22),  320000,  "Maintenance",  "Kinyeramo", "Generator servicing - Hillside Duplex",             landlord.Id, 5, "RCP-2024-009"),
                (new DateTime(2024, 4, 25),  200000,  "Cleaning",     "Kinyeramo", "Deep cleaning & pest control - Lakeside Bungalow",  landlord.Id, 6, "RCP-2024-010"),
                (new DateTime(2024, 5, 2),   180000,  "Maintenance",  "Kinyeramo", "Elevator maintenance - Metro Heights",              landlord.Id, 7, "RCP-2024-011"),
                (new DateTime(2024, 5, 5),   280000,  "Maintenance",  "Kinyeramo", "Electrical repair - Hillside Duplex",               landlord.Id, 5, "RCP-2024-012"),
                (new DateTime(2024, 5, 8),   650000,  "Insurance",    "Kinyeramo", "Property insurance premium - Oakwood Mansion",       landlord.Id, 8, "RCP-2024-013"),
                (new DateTime(2024, 5, 10),  120000,  "Utilities",    "Kinyeramo", "Electricity bill - common areas May 2024",          landlord.Id, 1, "RCP-2024-014"),
                (new DateTime(2024, 5, 12),  350000,  "Maintenance",  "Kinyeramo", "Pool cleaning & maintenance - Riverside Villas",     landlord.Id, 2, "RCP-2024-015"),
                (new DateTime(2024, 5, 15),  95000,   "Utilities",    "Kinyeramo", "Water bill - common areas May 2024",                landlord.Id, 3, "RCP-2024-016"),
                (new DateTime(2024, 5, 18),  220000,  "Security",     "Kinyeramo", "Security guard services - May 2024",                landlord.Id, 1, "RCP-2024-017"),
                (new DateTime(2024, 5, 20),  150000,  "Cleaning",     "Kinyeramo", "Garden & landscaping - Oakwood Mansion",            landlord.Id, 8, "RCP-2024-018"),
            };

            int expensesSeeded = 0;
            foreach (var e in expensesToSeed)
            {
                var exists = await db.PropertyExpenses.AnyAsync(x => x.ReceiptReference == e.ReceiptReference);
                if (exists)
                {
                    Console.WriteLine($"  [SKIP] Expense '{e.ReceiptReference}' already exists.");
                    continue;
                }

                db.PropertyExpenses.Add(new PropertyExpense
                {
                    Date = e.Date,
                    Amount = e.Amount,
                    Category = e.Category,
                    PaidBy = e.PaidBy,
                    Description = e.Description,
                    OwnerId = e.OwnerId,
                    PropertyId = e.PropertyId,
                    ReceiptReference = e.ReceiptReference,
                    CreatedAt = DateTime.UtcNow
                });
                expensesSeeded++;
                Console.WriteLine($"  [ADD]  {e.ReceiptReference} | {e.Category,-12} | UGX {e.Amount:N0} | {e.Description}");
            }
            await db.SaveChangesAsync();
            Console.WriteLine($"\nProperty expenses seeded : {expensesSeeded}  (total in DB: {await db.PropertyExpenses.CountAsync()})");

            Console.WriteLine($"\n=== Seed Complete ===");
            Console.WriteLine($"Properties seeded    : {seededCount}  (total in DB: {await db.LandLordProperties.CountAsync()})");
            Console.WriteLine($"Property units seeded: {unitsSeeded}  (total in DB: {await db.PropertyUnits.CountAsync()})");
            Console.WriteLine($"Tenants seeded       : {tenantsSeeded}  (total in DB: {await db.Tenants.CountAsync()})");
            Console.WriteLine($"Contracts seeded     : {contractsSeeded}  (total in DB: {await db.RentalContracts.CountAsync()})");
            Console.WriteLine($"Meters seeded        : {metersSeeded}  (total in DB: {await db.UtilityMeters.CountAsync()})");
            Console.WriteLine($"Transactions seeded  : {txSeeded}  (total in DB: {await db.UtilityPayments.CountAsync()})");
            Console.WriteLine($"Users in DB          : {await db.Users.CountAsync()}");
            Console.WriteLine($"HTTP logs in DB      : {await db.HttpRequesRequestResponses.CountAsync()}");
            Console.WriteLine($"Audit entries in DB  : {await db.AuditTrailEntries.CountAsync()}");
            Console.WriteLine($"Accounts in DB       : {await db.Accounts.CountAsync()}");
            Console.WriteLine($"Journal entries in DB: {await db.JournalEntries.CountAsync()}");
            Console.WriteLine($"Journal lines in DB  : {await db.JournalLines.CountAsync()}");
            Console.WriteLine($"Property expenses    : {await db.PropertyExpenses.CountAsync()}");
        }
    }
}
