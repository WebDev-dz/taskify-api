import { Hono } from "hono";
import { cors } from "hono/cors";
import { goalRoutes } from "./routes/goal.routes";
import { healthRoutes } from "./routes/health.routes";

const app = new Hono();

app.use("*", cors());

app.route("/", healthRoutes);
app.route("/", goalRoutes);

export default app;
