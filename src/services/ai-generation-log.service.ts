import { randomUUID } from "node:crypto";
import { getFirebaseDb } from "../config/firebase";
import {
  aiGenerationLogModel,
  type AiGenerationPrompt,
  type AiGenerationResult,
  type AiGenerationStatus,
  type AiGenerationLog,
} from "../models/ai-generations";

const AI_GENERATIONS_COLLECTION = "aiGenerations";

type PersistAiGenerationLogInput = {
  userId: string;
  prompt: AiGenerationPrompt;
  status: AiGenerationStatus;
  result?: AiGenerationResult;
  errorMessage?: string;
  savedAsGoalId?: string;
  savedAsTemplateId?: string;
  tokensUsed?: number;
  modelUsed?: string;
};

export async function persistAiGenerationLog(
  input: PersistAiGenerationLogInput,
): Promise<AiGenerationLog> {
  const now = new Date().toISOString();

  const log = aiGenerationLogModel.parse({
    id: randomUUID(),
    userId: input.userId,
    prompt: input.prompt,
    status: input.status,
    result: input.result,
    errorMessage: input.errorMessage,
    savedAsGoalId: input.savedAsGoalId,
    savedAsTemplateId: input.savedAsTemplateId,
    tokensUsed: input.tokensUsed,
    modelUsed: input.modelUsed,
    createdAt: now,
    completedAt: now,
  });

  await getFirebaseDb()
    .collection(AI_GENERATIONS_COLLECTION)
    .doc(log.id)
    .set(log);

  return log;
}
