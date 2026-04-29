import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { Context } from "hono";
import { createChatStream } from "../controllers/chat.controller";
import { createGoal } from "../controllers/goal.controller";
import { aiGenerationLogModel, aiGenerationPromptSchema } from "../models/ai-generations";
import { swaggerUI } from '@hono/swagger-ui'

const goalRoutes = new OpenAPIHono();

const errorResponseSchema = z.object({
  error: z.string(),
});

const userIdHeaderSchema = z.object({
  "x-user-id": z.string().min(1).openapi({
    param: {
      name: "x-user-id",
      in: "header",
      required: true,
    },
    example: "user_123",
  }),
});



const createChatRequestSchema = z.object({
  messages: z.array(z.any()).min(1).openapi({
    example: [{ role: "user", content: "Help me plan my goals for this week." }],
  }),
});

const createGoalRoute = createRoute({
  method: "post",
  path: "/api/goal",
  request: {
    headers: userIdHeaderSchema,
    body: {
      content: {
        "application/json": {
          schema: aiGenerationPromptSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Goal generated successfully",
      content: {
        "application/json": {
          schema: aiGenerationLogModel,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Failed to generate goal",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const createChatRoute = createRoute({
  method: "post",
  path: "/api/chat",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createChatRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Streaming chat response",
      content: {
        "text/event-stream": {
          schema: z.string(),
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Chat stream failed",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const loggerController = <T>(controller: (context: Context) => Promise<T>) => (context: Context) => {
  console.log({ req: context.req });
  return controller(context);
};

goalRoutes.openapi(createGoalRoute, loggerController(createGoal));
goalRoutes.openapi(createChatRoute, loggerController(createChatStream));

goalRoutes.doc("/api/doc", {
  openapi: "3.0.0",
  info: {
    title: "Taskify API",
    version: "1.0.0",
    description: "Goal generation and chat endpoints.",
  },
});

goalRoutes.get('/api/ui', swaggerUI({ url: '/api/doc' }))

export { goalRoutes };
