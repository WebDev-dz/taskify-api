import { Hono, type Context } from "hono";
import { createChatStream } from "../controllers/chat.controller";
import { createGoal } from "../controllers/goal.controller";

const goalRoutes = new Hono();

const loggerController = <T>(controller : (context : Context) => Promise<T>) => (context : Context) => {
    console.log({req: context.req})
    return controller(context)
}


goalRoutes.post("/api/goal", loggerController(createGoal));
goalRoutes.post("/api/chat", loggerController(createChatStream));

export { goalRoutes };
