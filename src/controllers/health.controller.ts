import type { Context } from "hono";

export function getHealth(c: Context) {
  return c.json({ message: "Hello, World!" }, 200);
}
