import { deepseek } from "@ai-sdk/deepseek";
import { Output, stepCountIs, streamText } from "ai";
import {
  aiGenerationResultSchema,
  type AiGenerationPrompt,
  type AiGenerationResult,
} from "../models/ai-generations";
import { ApiError } from "../errors/api-error";
import { researchTool } from "../tools/research";

const defaultHabitDays = [
  { key: "M", label: "Monday", active: false },
  { key: "T", label: "Tuesday", active: false },
  { key: "W", label: "Wednesday", active: false },
  { key: "Th", label: "Thursday", active: false },
  { key: "F", label: "Friday", active: false },
  { key: "S", label: "Saturday", active: false },
  { key: "Su", label: "Sunday", active: false },
] as const;

const supportedBarColors = [
  "blue", "green", "purple", "orange", "pink",
  "red", "yellow", "teal", "indigo",
] as const;

const deepseekModel = process.env.DEEPSEEK_MODEL ?? "deepseek-chat"; // ← changed for full tool + structured support

const systemPrompt = `
You are an expert productivity coach and goal-planning engine with 15+ years experience helping beginners achieve sustainable results.

You have access to a "research" tool. Use it whenever the goal would benefit from up-to-date evidence-based habits or tasks (Health & Fitness, Learning, Business, etc.).

## STEP-BY-STEP THINKING (internal only)
1. Understand the request, category, duration, and preferred days.
2. If helpful, call the research tool to get real-world data.
3. Break the goal into 2-4 concrete habits + 2-5 specific tasks.
4. Make everything beginner-friendly, measurable, and realistic.
5. Critique your draft: Is it specific? Actionable? Sustainable? Fix if needed.
6. Output ONLY valid JSON matching the schema.

## HARD SCHEMA RULES
- durationDays: positive integer (use user's preference or default 30)
- habits[].days: ALWAYS return all 7 days (M–Su) with correct keys/labels
- habits[].time: 12-hour format or omit if truly time-agnostic
- tasks[].bar: exactly one of: blue, green, purple, orange, pink, red, yellow, teal, indigo
- Output VALID JSON ONLY. No explanations.

## CONTENT QUALITY
- Habits: action-oriented + specific
- Tasks: concrete deliverables with clear dates (calculate from today if needed)
- notes: 1 short motivational sentence max
- Spread habit days realistically (3-5 active days for beginners unless user asks for daily)

Now generate the plan for the user request below.
`.trim();

export type GeneratedGoal = AiGenerationResult & {
  modelUsed: string;
  tokensUsed?: number;
};

export function extractPrompt(body: unknown) {
  if (
    body &&
    typeof body === "object" &&
    "prompt" in body &&
    body.prompt &&
    typeof body.prompt === "object"
  ) {
    return body.prompt;
  }
  return body;
}

export async function generateGoal(prompt: AiGenerationPrompt): Promise<GeneratedGoal> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new ApiError("Missing DeepSeek configuration. Set DEEPSEEK_API_KEY.", 500);
  }

  try {
    const result = await streamText({
      model: deepseek(deepseekModel),
      output: Output.object({ schema: aiGenerationResultSchema }),
      temperature: 0.7,
      system: systemPrompt,
      prompt: buildUserPrompt(prompt),
      tools: { research: researchTool },     // ← research tool wired in
      toolChoice: "auto",
      stopWhen: stepCountIs(4),
    });

    const structuredOutput = await result.output;
    const validated = aiGenerationResultSchema.safeParse(
      normalizeResult(structuredOutput, prompt),
    );

    if (!validated.success) {
      throw new ApiError("DeepSeek returned an invalid goal structure", 502, {
        issues: validated.error.flatten(),
      });
    }

    const usage = await result.usage;
    return {
      ...validated.data,
      modelUsed: deepseekModel,
      tokensUsed: typeof usage?.totalTokens === "number" ? usage.totalTokens : undefined,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : "DeepSeek generation failed",
      502,
    );
  }
}

function buildUserPrompt(prompt: AiGenerationPrompt) {
  return [
    `User request: ${prompt.rawInput}`,
    prompt.category ? `Category: ${prompt.category}` : undefined,
    prompt.durationDays ? `Preferred duration: ${prompt.durationDays} days` : undefined,
    prompt.preferredHabitDays?.length
      ? `Preferred habit days: ${prompt.preferredHabitDays.join(", ")}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeResult(value: unknown, prompt: AiGenerationPrompt): unknown {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    title: readNonEmptyString(record.title) ?? fallbackTitle(prompt.rawInput),
    category: readNonEmptyString(record.category) ?? prompt.category ?? "Personal Growth",
    note: readOptionalString(record.note),
    durationDays: readPositiveInteger(record.durationDays) ?? prompt.durationDays ?? 30,
    habits: normalizeHabits(record.habits, prompt.preferredHabitDays),
    tasks: normalizeTasks(record.tasks),
  };
}

function normalizeHabits(value: unknown, preferredHabitDays?: string[]) {
  if (!Array.isArray(value)) return [];
  return value
    .map((habit) => {
      const record = habit && typeof habit === "object" ? (habit as Record<string, unknown>) : {};
      const name = readNonEmptyString(record.name);
      if (!name) return null;
      return {
        name,
        days: normalizeHabitDays(record.days, preferredHabitDays),
        hasReminder: Boolean(record.hasReminder),
        time: readOptionalString(record.time),
        note: readOptionalString(record.note),
      };
    })
    .filter((habit): habit is NonNullable<typeof habit> => Boolean(habit));
}

function normalizeHabitDays(value: unknown, preferredHabitDays?: string[]) {
  const activeKeys = new Set<string>();

  if (Array.isArray(value)) {
    for (const day of value) {
      if (!day || typeof day !== "object") continue;
      const record = day as Record<string, unknown>;
      const normalizedKey = normalizeDayKey(record.key ?? record.label);
      if (normalizedKey && Boolean(record.active)) activeKeys.add(normalizedKey);
    }
  }

  const preferredKeys = new Set(
    (preferredHabitDays ?? [])
      .map((day) => normalizeDayKey(day))
      .filter((day): day is NonNullable<typeof day> => day !== undefined),
  );

  return defaultHabitDays.map((day) => ({
    key: day.key,
    label: day.label,
    active:
      activeKeys.size > 0
        ? activeKeys.has(day.key)
        : preferredKeys.size > 0
          ? preferredKeys.has(day.key)
          : ["M", "W", "F"].includes(day.key),
  }));
}

function normalizeTasks(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((task) => {
      const record = task && typeof task === "object" ? (task as Record<string, unknown>) : {};
      const name = readNonEmptyString(record.name);
      if (!name) return null;
      return {
        name,
        time: readOptionalString(record.time),
        note: readOptionalString(record.note),
        hasReminder: Boolean(record.hasReminder),
        bar: normalizeBarColor(record.bar),
      };
    })
    .filter((task): task is NonNullable<typeof task> => Boolean(task));
}

function normalizeDayKey(value: unknown) {
  if (typeof value !== "string") return undefined;
  switch (value.trim().toLowerCase()) {
    case "m":
    case "mon":
    case "monday":
      return "M";
    case "t":
    case "tu":
    case "tue":
    case "tuesday":
      return "T";
    case "w":
    case "wed":
    case "wednesday":
      return "W";
    case "th":
    case "thu":
    case "thur":
    case "thursday":
      return "Th";
    case "f":
    case "fri":
    case "friday":
      return "F";
    case "s":
    case "sat":
    case "saturday":
      return "S";
    case "su":
    case "sun":
    case "sunday":
      return "Su";
    default:
      return undefined;
  }
}

function normalizeBarColor(value: unknown) {
  if (typeof value !== "string") return "blue";
  const normalized = value.trim().toLowerCase();
  return supportedBarColors.includes(normalized as (typeof supportedBarColors)[number])
    ? normalized
    : "blue";
}

function readNonEmptyString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readOptionalString(value: unknown) {
  return readNonEmptyString(value);
}

function readPositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : undefined;
}

function fallbackTitle(rawInput: string) {
  const cleaned = rawInput.replace(/\s+/g, " ").trim();
  return cleaned.length > 80 ? `${cleaned.slice(0, 77).trim()}...` : cleaned;
}
