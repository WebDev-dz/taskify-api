// models/userStats.ts
import z from "zod";

// Stored at: users/{userId}/stats/summary  (single doc, updated via Cloud Function)
// Purpose: fast reads for dashboard/home screen without scanning all goals
export const userStatsModel = z.object({
  userId: z.string(),

  // Goals
  totalGoals: z.number().int().nonnegative(),
  activeGoals: z.number().int().nonnegative(),
  completedGoals: z.number().int().nonnegative(),
  abandonedGoals: z.number().int().nonnegative(),

  // AI usage
  aiGenerationsTotal: z.number().int().nonnegative(),
  aiGenerationsThisMonth: z.number().int().nonnegative(), // reset monthly

  // Templates
  templatesCreated: z.number().int().nonnegative(),
  templatesClonesReceived: z.number().int().nonnegative(), // how many others cloned yours
  templatesClonesUsed: z.number().int().nonnegative(), // how many you cloned

  // Streaks (across all goals)
  bestOverallStreak: z.number().int().nonnegative(),
  currentOverallStreak: z.number().int().nonnegative(),

  // Completion rates (rolling 30 days)
  habitCompletionRate30d: z.number().min(0).max(1),
  taskCompletionRate30d: z.number().min(0).max(1),

  // Category breakdown — useful for "you do best with Fitness goals" insights
  categoryStats: z.array(
    z.object({
      category: z.string(),
      goalCount: z.number().int().nonnegative(),
      avgCompletionRate: z.number().min(0).max(1),
    }),
  ),

  lastUpdated: z.string(),
});

export type UserStats = z.infer<typeof userStatsModel>;
