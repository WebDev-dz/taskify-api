// models/tasks.ts
import z from "zod";

// Define ThemeColor as a union (recommended for better type safety)
const themeColorSchema = z.enum([
  "blue",
  "green",
  "purple",
  "orange",
  "pink",
  "red",
  "yellow",
  "teal",
  "indigo",
  // Add more colors as needed from your ThemeColor type
]);

// Main Task Schema
export const taskModel = z.object({
  id: z.string().min(1, "Task ID is required"),

  name: z
    .string()
    .min(1, "Task name is required")
    .max(150, "Task name is too long"),

  time: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/.test(val),
      { message: "Time must be in format like '09:00 AM' or '14:30 PM'" },
    ),

  note: z.string().optional(),

  done: z.boolean(),

  hasReminder: z.boolean(),

  date: z.string().optional(), // Optional date field

  notificationId: z.string().optional(),

  bar: themeColorSchema, // Color for the progress bar / indicator
});

// Schema for creating a new task (id will be generated)
export const createTaskModel = taskModel.omit({ id: true });

export type Task = z.infer<typeof taskModel>;
export type CreateTask = z.infer<typeof createTaskModel>;
export type ThemeColor = z.infer<typeof themeColorSchema>;
