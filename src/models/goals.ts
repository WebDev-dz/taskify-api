// models/goals.ts
import z from "zod";
import { habitModel } from "./habits";
import { taskModel } from "./tasks";

export const goalDetailModel = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  image: z.url().optional(),
  category: z.string(),
  daysLeft: z.number().int().nonnegative(),
  dueDate: z.string().optional().refine(isValidISODate, {
    message: "Invalid ISO date or datetime",
  }),
  startTime: z.string(),
  habits: z.array(habitModel),
  tasks: z.array(taskModel),
  note: z.string().optional(),
  userId: z.string(),
  completed: z.boolean().default(false), // added for completeness
});

export type Goal = z.infer<typeof goalDetailModel>;

function isValidISODate(value: string | undefined) {
  if (!value) return true;
  if (!ISO_DATE_OR_DATETIME_REGEX.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

const ISO_DATE_OR_DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/;
