import { describe, expect, it } from "vitest";
import { firstError, measurementSchema, memberFormSchema, paymentSchema } from "../lib/schemas";

const validMember = {
  name: "Selam Bekele",
  email: "selam@example.com",
  phone: "+251 91 123 4567",
  plan: "Monthly" as const,
  startDate: "2026-11-01",
  trainerId: "TR-01",
  goal: "General fitness",
  frozen: false,
};

describe("member form validation", () => {
  it("accepts a complete, valid member", () => {
    expect(firstError(memberFormSchema.safeParse(validMember))).toBeNull();
  });

  it("accepts an empty phone number because it is optional", () => {
    expect(firstError(memberFormSchema.safeParse({ ...validMember, phone: "" }))).toBeNull();
  });

  it("rejects a name that is too short", () => {
    expect(firstError(memberFormSchema.safeParse({ ...validMember, name: "A" }))).toBe("Enter the member's full name.");
  });

  it("rejects an invalid email address", () => {
    expect(firstError(memberFormSchema.safeParse({ ...validMember, email: "not-an-email" }))).toBe("Enter a valid email address.");
  });

  it("rejects a phone number with letters", () => {
    expect(firstError(memberFormSchema.safeParse({ ...validMember, phone: "call me" }))).toContain("Phone");
  });

  it("rejects an unknown plan", () => {
    expect(memberFormSchema.safeParse({ ...validMember, plan: "Gold" }).success).toBe(false);
  });

  it("rejects a malformed start date", () => {
    expect(firstError(memberFormSchema.safeParse({ ...validMember, startDate: "01/11/2026" }))).toBe("Choose a valid date.");
  });
});

describe("payment validation", () => {
  const validPayment = { memberId: "MEM-001", plan: "Monthly" as const, amount: 69, method: "Card", status: "Paid" as const };

  it("accepts a valid payment", () => {
    expect(firstError(paymentSchema.safeParse(validPayment))).toBeNull();
  });

  it("requires a member", () => {
    expect(firstError(paymentSchema.safeParse({ ...validPayment, memberId: "" }))).toBe("Select a member first.");
  });

  it("rejects zero and negative amounts", () => {
    expect(paymentSchema.safeParse({ ...validPayment, amount: 0 }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...validPayment, amount: -20 }).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(paymentSchema.safeParse({ ...validPayment, status: "Maybe" }).success).toBe(false);
  });
});

describe("measurement validation", () => {
  const valid = { weight: 80, bodyFat: 18, chest: 100, waist: 85, arms: 35 };

  it("accepts realistic measurements", () => {
    expect(firstError(measurementSchema.safeParse(valid))).toBeNull();
  });

  it("rejects impossible values", () => {
    expect(measurementSchema.safeParse({ ...valid, weight: 5 }).success).toBe(false);
    expect(measurementSchema.safeParse({ ...valid, bodyFat: 90 }).success).toBe(false);
    expect(measurementSchema.safeParse({ ...valid, waist: 0 }).success).toBe(false);
  });

  it("rejects values that are not numbers", () => {
    expect(measurementSchema.safeParse({ ...valid, weight: Number.NaN }).success).toBe(false);
  });
});
