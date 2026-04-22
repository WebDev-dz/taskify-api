// models/progress.ts
import z from "zod";

// --- Habit progress for a single day ---
export const habitDayProgressModel = z.object({
  habitId: z.string(),
  habitName: z.string(), // denormalized for charts
  date: z.string(), // "YYYY-MM-DD"
  completed: z.boolean(),
  scheduledForToday: z.boolean(), // false if that habit wasn't due that day
});

// --- Task progress snapshot ---
export const taskProgressModel = z.object({
  taskId: z.string(),
  taskName: z.string(), // denormalized
  completedAt: z.string().optional(), // ISO timestamp, null if not done
  done: z.boolean(),
});

// --- Daily snapshot (one doc per goal per day in Firestore) ---
// Collection path: goals/{goalId}/dailyProgress/{YYYY-MM-DD}
export const dailyProgressModel = z.object({
  id: z.string(), // "YYYY-MM-DD"
  goalId: z.string(),
  userId: z.string(),
  date: z.string(), // "YYYY-MM-DD"

  habits: z.array(habitDayProgressModel),
  tasks: z.array(taskProgressModel),

  // Computed on write (Cloud Function or client)
  habitCompletionRate: z.number().min(0).max(1), // 0.0 – 1.0
  taskCompletionRate: z.number().min(0).max(1),
  overallScore: z.number().min(0).max(1), // weighted average

  streak: z.number().int().nonnegative(), // current streak at this day

  createdAt: z.string(),
  updatedAt: z.string(),
});

// --- Goal-level progress summary (stored on the goal doc or as subcollection) ---
// Collection path: goals/{goalId}/progressSummary/latest  (single doc)
export const goalProgressSummaryModel = z.object({
  goalId: z.string(),
  userId: z.string(),

  totalDays: z.number().int().nonnegative(),
  daysElapsed: z.number().int().nonnegative(),
  daysRemaining: z.number().int().nonnegative(),

  // Habits
  totalHabitOccurrences: z.number().int().nonnegative(),
  completedHabitOccurrences: z.number().int().nonnegative(),
  habitCompletionRate: z.number().min(0).max(1),

  // Tasks
  totalTasks: z.number().int().nonnegative(),
  completedTasks: z.number().int().nonnegative(),
  taskCompletionRate: z.number().min(0).max(1),

  // Streaks
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),

  // Per-habit breakdown (for detailed charts)
  habitBreakdown: z.array(
    z.object({
      habitId: z.string(),
      habitName: z.string(),
      completionRate: z.number().min(0).max(1),
      totalScheduled: z.number().int().nonnegative(),
      totalCompleted: z.number().int().nonnegative(),
    }),
  ),

  overallScore: z.number().min(0).max(1), // headline number for the UI
  projectedCompletionScore: z.number().min(0).max(1).optional(),

  lastUpdated: z.string(), // ISO timestamp
});

export type DailyProgress = z.infer<typeof dailyProgressModel>;
export type GoalProgressSummary = z.infer<typeof goalProgressSummaryModel>;
export type HabitDayProgress = z.infer<typeof habitDayProgressModel>;
export type TaskProgress = z.infer<typeof taskProgressModel>;
