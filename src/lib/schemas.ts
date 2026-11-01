import { z } from "zod";

// Validation rules shared by the forms and the unit tests.
// Each helper returns the first error message, or null when the input is valid.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.");

export const memberFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the member's full name.").max(80, "Name must be 80 characters or fewer."),
  email: z
    .string()
    .trim()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[+()\d\s-]{7,20}$/.test(v), "Phone can only contain digits, spaces, + - ( ) and must be 7 to 20 characters."),
  plan: z.enum(["Monthly", "Quarterly", "Annual", "VIP"], { message: "Choose a plan." }),
  startDate: isoDate,
  trainerId: z.string().min(1, "Choose a trainer."),
  goal: z.string().trim().max(80, "Goal must be 80 characters or fewer."),
  frozen: z.boolean(),
});

export const paymentSchema = z.object({
  memberId: z.string().min(1, "Select a member first."),
  plan: z.enum(["Monthly", "Quarterly", "Annual", "VIP"], { message: "Choose a plan." }),
  amount: z.number({ message: "Enter an amount." }).positive("Amount must be greater than zero.").max(100000, "Amount is too large."),
  method: z.string().trim().min(1, "Choose a payment method."),
  status: z.enum(["Paid", "Pending", "Overdue"], { message: "Choose a payment status." }),
});

export const measurementSchema = z.object({
  weight: z.number({ message: "Enter your weight." }).min(20, "Weight must be between 20 and 400 kg.").max(400, "Weight must be between 20 and 400 kg."),
  bodyFat: z.number({ message: "Enter body fat." }).min(2, "Body fat must be between 2 and 70 percent.").max(70, "Body fat must be between 2 and 70 percent."),
  chest: z.number({ message: "Enter chest size." }).min(30, "Chest must be between 30 and 250 cm.").max(250, "Chest must be between 30 and 250 cm."),
  waist: z.number({ message: "Enter waist size." }).min(30, "Waist must be between 30 and 250 cm.").max(250, "Waist must be between 30 and 250 cm."),
  arms: z.number({ message: "Enter arm size." }).min(10, "Arms must be between 10 and 100 cm.").max(100, "Arms must be between 10 and 100 cm."),
});

export function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }): string | null {
  if (result.success) return null;
  return result.error?.issues[0]?.message ?? "Check the form and try again.";
}
