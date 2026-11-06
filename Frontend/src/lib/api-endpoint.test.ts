import { buildApiEndpoint } from "./api-endpoint";

describe("buildApiEndpoint", () => {
  it("appends an /api route to a bare host", () => {
    expect(buildApiEndpoint("https://api.dangotechconcepts.com", "/api/AdminBillPayments/trigger")).toBe(
      "https://api.dangotechconcepts.com/api/AdminBillPayments/trigger"
    );
  });

  it("does not duplicate an existing /api suffix in the base URL", () => {
    expect(buildApiEndpoint("https://example.test/api", "/api/AdminBillPayments/trigger")).toBe(
      "https://example.test/api/AdminBillPayments/trigger"
    );
    expect(buildApiEndpoint("https://example.test/api/User/", "/api/AdminBillPayments")).toBe(
      "https://example.test/api/AdminBillPayments"
    );
  });

  it("normalises trailing slashes and paths without a leading slash", () => {
    expect(buildApiEndpoint("https://example.test///", "api/AdminPayoutReconciliation")).toBe(
      "https://example.test/api/AdminPayoutReconciliation"
    );
  });

  it("handles a missing or blank base URL", () => {
    expect(buildApiEndpoint(undefined, "/api/AdminBillPayments")).toBe("/api/AdminBillPayments");
    expect(buildApiEndpoint("   ", "/api/AdminBillPayments")).toBe("/api/AdminBillPayments");
  });
});
