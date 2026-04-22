import { Hono, type Context } from "hono";
import { createGoal } from "../controllers/goal.controller";

const goalRoutes = new Hono();
const loggerController = (context : Context) => {
    console.log({req: context.req})
    return createGoal(context)
}
goalRoutes.post("/api/goal", loggerController);

export { goalRoutes };
