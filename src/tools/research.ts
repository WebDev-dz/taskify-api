import { tool } from "ai";
import { z } from "zod";


export const researchTool = tool<{ category: string; goal: string }, string>({
  description:
    "Research the latest evidence-based habits, best practices, and actionable tasks for a specific goal category. Use this when you need real-world data to make the plan more effective and realistic (especially for Health, Fitness, Learning, Business, etc.).",
  inputSchema: z.object({
    category: z.string().describe("The category of the goal, e.g. Health & Fitness"),
    goal: z.string().describe("The user's raw goal request"),
  }),
  execute: async ({ category, goal }) => {
    if (!process.env.TAVILY_API_KEY) {
      return "No Tavily API key configured. Using general best practices.";
    }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: `best beginner ${category.toLowerCase()} habits tasks action steps for goal: ${goal} 2026`,
          search_depth: "basic",
          max_results: 6,
          include_answer: true,
        }),
      });

      if (!response.ok) throw new Error("Tavily request failed");

      const data = await response.json();

      const summary = [
        data.answer ? `Key insights from research: ${data.answer}` : "",
        ...(data.results || [])
          .slice(0, 4)
          .map((r: any) => `• ${r.title}: ${r.content?.slice(0, 180)}...`),
      ]
        .filter(Boolean)
        .join("\n\n");

      return summary || "No additional research data found. Using general knowledge.";
    } catch (err) {
      console.warn("Tavily research failed:", err);
      return "Research unavailable right now. Falling back to general best practices.";
    }
  },
});