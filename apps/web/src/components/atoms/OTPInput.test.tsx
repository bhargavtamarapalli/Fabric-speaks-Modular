import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OTPInput } from "./OTPInput";

describe("OTPInput", () => {
  it("renders correct number of inputs", () => {
    render(<OTPInput length={4} value="" onChange={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(4);
  });

  it("calls onChange when typing", () => {
    const handleChange = vi.fn();
    render(<OTPInput length={6} value="" onChange={handleChange} />);
    const inputs = screen.getAllByRole("textbox");
    
    fireEvent.keyDown(inputs[0], { key: "1" });
    expect(handleChange).toHaveBeenCalledWith("1");
  });

  it("calls onComplete when fully filled", () => {
    const handleComplete = vi.fn();
    // Simulate user has already typed 1, and now types 2 in the second box
    render(<OTPInput length={2} value="1 " onChange={() => {}} onComplete={handleComplete} />);
    const inputs = screen.getAllByRole("textbox");
    
    fireEvent.keyDown(inputs[1], { key: "2" });
    expect(handleComplete).toHaveBeenCalledWith("12");
  });

  it("handles backspace correctly", () => {
    const handleChange = vi.fn();
    render(<OTPInput length={4} value="12  " onChange={handleChange} />);
    const inputs = screen.getAllByRole("textbox");
    
    fireEvent.keyDown(inputs[1], { key: "Backspace" });
    expect(handleChange).toHaveBeenCalledWith("1  ");
  });
});
