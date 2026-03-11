import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "./page";
import { apiFetch } from "@/lib/apiClient";
import userEvent from "@testing-library/user-event";

// Mock the API client
vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders initial state correctly", () => {
    render(<LoginPage />);
    expect(screen.getByText("Welcome to Fabric Speaks")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("10-digit mobile number")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send otp/i })).toBeDisabled();
  });

  it("enables submit button only for 10-digit numbers", async () => {
    render(<LoginPage />);
    const input = screen.getByPlaceholderText("10-digit mobile number");
    const button = screen.getByRole("button", { name: /send otp/i });

    await userEvent.type(input, "12345");
    expect(button).toBeDisabled();

    await userEvent.type(input, "67890");
    expect(button).toBeEnabled();
  });

  it("handles successful OTP send and transitions to verification state", async () => {
    (apiFetch as any).mockResolvedValueOnce({ success: true });
    render(<LoginPage />);
    
    const input = screen.getByPlaceholderText("10-digit mobile number");
    const button = screen.getByRole("button", { name: /send otp/i });

    await userEvent.type(input, "9876543210");
    fireEvent.click(button);

    // Initial state is "sending" (spider loader)
    await waitFor(() => {
      expect(screen.getByText(/We've sent a 6-digit code/i)).toBeInTheDocument();
    });

    // Should render OTP inputs
    const otpInputs = screen.getAllByRole("textbox", { name: /otp digit/i });
    expect(otpInputs).toHaveLength(6);
  });

  it("displays error message on failed OTP send", async () => {
    (apiFetch as any).mockRejectedValueOnce(new Error("Rate limited. Try again later."));
    render(<LoginPage />);
    
    const input = screen.getByPlaceholderText("10-digit mobile number");
    const button = screen.getByRole("button", { name: /send otp/i });

    await userEvent.type(input, "9876543210");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Rate limited. Try again later.")).toBeInTheDocument();
    });
    
    // Should still show the phone input
    expect(screen.getByPlaceholderText("10-digit mobile number")).toBeInTheDocument();
  });

  it("verifies OTP completely", async () => {
    (apiFetch as any)
      .mockResolvedValueOnce({ success: true }) // send-otp
      .mockResolvedValueOnce({ success: true }); // verify-otp

    render(<LoginPage />);
    
    const phoneInput = screen.getByPlaceholderText("10-digit mobile number");
    await userEvent.type(phoneInput, "9876543210");
    fireEvent.click(screen.getByRole("button", { name: /send otp/i }));

    await waitFor(() => {
      expect(screen.getAllByRole("textbox", { name: /otp digit/i })).toHaveLength(6);
    });

    const otpInputs = screen.getAllByRole("textbox", { name: /otp digit/i });
    
    // Type OTP - we have to trigger keydown to simulate the component's internal logic securely
    for (let i = 0; i < 6; i++) {
      fireEvent.keyDown(otpInputs[i], { key: "1" });
    }

    await waitFor(() => {
      expect(screen.getByText("Verified successfully! Redirecting...")).toBeInTheDocument();
    });
    
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch).toHaveBeenNthCalledWith(2, "/auth/verify-otp", expect.objectContaining({
      method: "POST",
      data: JSON.stringify({ mobile: "9876543210", otp: "111111" })
    }));
  });
});
