// models/aiGeneration.ts
import z from "zod";

export const aiGenerationStatusSchema = z.enum([
  "pending",
  "success",
  "failed",
  "cancelled",
]);

export const aiGenerationPromptSchema = z.object({
  // What the user typed
  rawInput: z.string().min(1).max(1000),

  // Optional context the app sends alongside the prompt
  category: z.string().optional(),
  durationDays: z.number().int().positive().optional(),
  today: z.string().optional().default(new Date().toISOString().split("T")[0]),
  preferredHabitDays: z.array(z.string()).optional(), // e.g. ["M","W","F"]
});

export const aiGenerationResultSchema = z.object({
  // The generated goal fields — mirrors goalDetailModel minus runtime fields
  title: z.string(),
  category: z.string(),
  note: z.string().optional(),
  durationDays: z.number().int().positive(),
  habits: z.array(
    z.object({
      name: z.string(),
      days: z.array(
        z.object({ key: z.string(), label: z.string(), active: z.boolean() }),
      ),
      hasReminder: z.boolean(),
      time: z.string().optional(),
      note: z.string().optional(),
    }),
  ),
  tasks: z.array(
    z.object({
      name: z.string(),
      time: z.string(),
      date: z.string().default(new Date().toISOString().split("T")[0]),
      done: z.boolean().optional().default(false),
      note: z.string().optional(),
      hasReminder: z.boolean(),
      bar: z.string(),
    }),
  ),
});

export const aiGenerationLogModel = z.object({
  id: z.string(),
  userId: z.string(),

  prompt: aiGenerationPromptSchema,

  status: aiGenerationStatusSchema,

  // Populated on success
  result: aiGenerationResultSchema.optional(),

  // Populated on failure
  errorMessage: z.string().optional(),

  // If the user accepted the result and created a goal / saved as template
  savedAsGoalId: z.string().optional(),
  savedAsTemplateId: z.string().optional(),

  // Token/cost tracking (useful for SaaS billing later)
  tokensUsed: z.number().int().nonnegative().optional(),
  modelUsed: z.string().optional(), // e.g. "claude-sonnet-4-20250514"

  createdAt: z.string(),
  completedAt: z.string().optional(),
});

export type AiGenerationLog = z.infer<typeof aiGenerationLogModel>;
export type AiGenerationPrompt = z.infer<typeof aiGenerationPromptSchema>;
export type AiGenerationResult = z.infer<typeof aiGenerationResultSchema>;
export type AiGenerationStatus = z.infer<typeof aiGenerationStatusSchema>;
