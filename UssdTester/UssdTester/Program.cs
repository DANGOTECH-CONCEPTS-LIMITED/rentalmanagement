using System.Net.Http;
using System.Net.Http.Headers;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("=== USSD API Tester ===");

        // ✅ Update this URL to match your actual endpoint
        string endpoint = "http://localhost:5030/ussd";

        var sessionId = Guid.NewGuid().ToString();
        var phoneNumber = "+256779000111";
        var networkCode = "UGA001";
        var serviceCode = "*123#";

        while (true)
        {
            Console.Write("Enter USSD text (e.g., 1*12345*1 or leave empty): ");
            var text = Console.ReadLine() ?? "";

            var formData = new Dictionary<string, string>
            {
                { "SessionId", sessionId },
                { "PhoneNumber", phoneNumber },
                { "NetworkCode", networkCode },
                { "ServiceCode", serviceCode },
                { "Text", text }
            };

            using var client = new HttpClient();
            using var content = new FormUrlEncodedContent(formData);

            // ✅ Don't override Content-Type here; let FormUrlEncodedContent handle it
            // content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

            try
            {
                var response = await client.PostAsync(endpoint, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                Console.WriteLine("\n--- Response ---");
                Console.WriteLine(responseContent);
                Console.WriteLine("---------------\n");
            }
            catch (Exception ex)
            {
                Console.WriteLine("ERROR: " + ex.Message);
            }

            Console.Write("Test again? (y/n): ");
            var again = Console.ReadLine();
            if (!again?.Trim().Equals("y", StringComparison.OrdinalIgnoreCase) ?? true)
                break;
        }
    }
}
