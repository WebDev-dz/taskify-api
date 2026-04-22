import type { Context } from "hono";
import { aiGenerationPromptSchema, type AiGenerationResult } from "../models/ai-generations";
import { ApiError } from "../errors/api-error";
import { extractPrompt, generateGoal } from "../services/goal.service";
import { persistAiGenerationLog } from "../services/ai-generation-log.service";

export async function createGoal(c: Context) {
  let promptForLogging:
    | ReturnType<typeof aiGenerationPromptSchema.parse>
    | undefined;
  let userId: string | undefined;

  try {
    const body = await c.req.json();
    userId = extractUserId(body, c);
    const promptResult = aiGenerationPromptSchema.safeParse(extractPrompt(body));

    if (!userId) {
      return c.json(
        { error: "Missing userId. Provide it in the request body or x-user-id header." },
        400,
      );
    }

    if (!promptResult.success) {
      return c.json(
        { error: "Invalid AI generation prompt", issues: promptResult.error.flatten() },
        400,
      );
    }

    promptForLogging = promptResult.data;
    const generated = await generateGoal(promptResult.data);
    const { modelUsed, tokensUsed, ...result } = generated;
    const log = await persistAiGenerationLog({
      userId,
      prompt: promptResult.data,
      status: "success",
      result: result as AiGenerationResult,
      modelUsed,
      tokensUsed,
    });

    c.header("x-ai-model", generated.modelUsed);
    if (generated.tokensUsed !== undefined) {
      c.header("x-ai-tokens-used", String(generated.tokensUsed));
    }
    c.header("x-ai-generation-id", log.id);
    console.log(JSON.stringify(generated));
    return c.json(generated, 200);
  } catch (error) {
    if (promptForLogging && userId) {
      try {
        await persistAiGenerationLog({
          userId,
          prompt: promptForLogging,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown AI generation failure",
        });
      } catch (logError) {
        console.error("Failed to persist AI generation failure log", logError);
      }
    }

    if (error instanceof ApiError) {
      return c.json({ error: error.message, details: error.details }, error.status as any);
    }

    return c.json({ error: "Failed to generate AI goal" }, 500);
  }
}

function extractUserId(body: unknown, c: Context) {
  const headerUserId = c.req.header("x-user-id")?.trim();
  if (headerUserId) {
    return headerUserId;
  }

  if (!body || typeof body !== "object" || !("userId" in body)) {
    return undefined;
  }

  const { userId } = body;
  return typeof userId === "string" && userId.trim().length > 0 ? userId.trim() : undefined;
}
