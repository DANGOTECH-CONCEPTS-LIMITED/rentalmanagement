import { render, screen } from "@testing-library/react";
import ManageUsers from "./ManageUsers";
import axios from "axios";

// Mock dependencies
jest.mock("axios");
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Vite environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    VITE_API_BASE_URL: "http://3.216.182.63:8091",
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe("ManageUsers Component", () => {
  beforeEach(() => {
    // Set up mocks for API calls
    (axios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/GetAllRoles")) {
        return Promise.resolve({ data: [] });
      } else if (url.includes("/GetAllUsers")) {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error("not found"));
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders the component title", async () => {
    render(<ManageUsers />);
    expect(screen.getByText("Manage Users")).toBeInTheDocument();
  });
});
