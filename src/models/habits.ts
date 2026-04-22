// models/habits.ts
import z from "zod";

// First, define HabitDay schema
export const habitDaySchema = z.object({
  key: z.string(), // e.g. "M", "T", "W", "Th", "F", "S", "Su"
  label: z.string(), // e.g. "Monday", "Tue"
  active: z.boolean(),
});

// Main Habit Schema
export const habitModel = z.object({
  id: z.string().min(1, "Habit ID is required"),
  name: z
    .string()
    .min(1, "Habit name is required")
    .max(100, "Habit name is too long"),

  days: z
    .array(habitDaySchema)
    .min(1, "At least one day must be selected for the habit"),

  hasReminder: z.boolean(),

  time: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/.test(val),
      { message: "Time must be in format like '09:00 AM' or '14:30 PM'" },
    ),

  note: z.string().optional(),
  notificationId: z.string().optional(),
});

// Export TypeScript type inferred from Zod schema
export type Habit = z.infer<typeof habitModel>;
export type HabitDay = z.infer<typeof habitDaySchema>;
