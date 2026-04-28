import type { Context } from "hono";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { z } from "zod";
import { researchTool } from "../tools/research";
import { prayersTool } from "../tools/prayers";

const deepseekModel = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

const chatRequestSchema = z.object({
  messages: z.array(z.any()).min(1),
});

const chatSystemPrompt = `
You are a helpful productivity assistant for a goal-planning app.
- Keep answers concise and practical.
- Ask one clarifying question when user intent is ambiguous.
- Prefer actionable suggestions the user can execute today.
`.trim();

export async function createChatStream(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid chat request payload", issues: parsed.error.flatten() },
      400,
    );
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return c.json({ error: "Missing DeepSeek configuration. Set DEEPSEEK_API_KEY." }, 500);
  }

  const messages = await convertToModelMessages(parsed.data.messages as any[]);

  const result = streamText({
    model: deepseek(deepseekModel),
    system: chatSystemPrompt,
    messages,
    temperature: 0.7,
    tools: { research: researchTool, prayers : prayersTool },
    toolChoice: "auto",
    stopWhen: stepCountIs(4),
    onFinish: (result) => {
      console.log({result})
    }
    
  });
  return result.toUIMessageStreamResponse({
    originalMessages: parsed.data.messages as any[],
    onError: () => "Chat stream failed",
  });
}
