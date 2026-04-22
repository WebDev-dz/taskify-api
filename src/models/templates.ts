// models/template.ts
import z from "zod";
import { habitModel } from "./habits";
import { taskModel } from "./tasks";

export const templateVisibilitySchema = z.enum(["public", "private"]);
export const templateSourceSchema = z.enum(["user", "ai", "official"]);

// A template strips runtime fields (id, userId, daysLeft, dueDate, completed)
// and replaces tasks/habits with "blueprints" (no id, no done state)
export const habitBlueprintModel = habitModel.omit({ id: true });
export const taskBlueprintModel = taskModel.omit({ id: true, done: true });

export const templateModel = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  image: z.string().url().optional(),
  category: z.string(),

  // Duration in days (user picks their own start/due dates on clone)
  durationDays: z.number().int().positive(),

  habits: z.array(habitBlueprintModel),
  tasks: z.array(taskBlueprintModel),
  note: z.string().optional(),

  // Ownership & visibility
  authorId: z.string(), // userId who created it
  authorName: z.string().optional(), // denormalized for display
  visibility: templateVisibilitySchema,
  source: templateSourceSchema, // "user" | "ai" | "official"

  // Engagement metrics
  cloneCount: z.number().int().nonnegative().default(0),
  rating: z.number().min(0).max(5).optional(),
  ratingCount: z.number().int().nonnegative().default(0),

  tags: z.array(z.string()).default([]),

  createdAt: z.string(), // ISO timestamp
  updatedAt: z.string(),
});

export type Template = z.infer<typeof templateModel>;
export type HabitBlueprint = z.infer<typeof habitBlueprintModel>;
export type TaskBlueprint = z.infer<typeof taskBlueprintModel>;
export type TemplateVisibility = z.infer<typeof templateVisibilitySchema>;
export type TemplateSource = z.infer<typeof templateSourceSchema>;
