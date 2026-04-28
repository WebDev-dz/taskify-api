import { tool } from "ai";
import { z } from "zod";
import { DailyPrayerTimesApi } from "../api/prayers/apis/DailyPrayerTimesApi";
import { Configuration } from "../api/prayers/runtime";

const prayersToolInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  date: z
    .string()
    .optional()
    .describe("Date in DD-MM-YYYY format. Defaults to today when omitted."),
  method: z
    .number()
    .int()
    .min(0)
    .max(99)
    .optional()
    .describe("Prayer calculation method id."),
});

function formatDateForApi(inputDate?: string) {
  if (inputDate) return inputDate;

  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const year = String(now.getUTCFullYear());
  return `${day}-${month}-${year}`;
}

function sanitizeTime(value?: string) {
  if (!value) return undefined;
  // API may return values like "04:12 (+03)"; keep only HH:mm
  return value.split(" ")[0];
}

export const prayersTool = tool<
  z.infer<typeof prayersToolInputSchema>,
  | {
      date: string;
      timezone?: string;
      timings?: {
        fajr?: string;
        sunrise?: string;
        dhuhr?: string;
        asr?: string;
        maghrib?: string;
        isha?: string;
        imsak?: string;
        midnight?: string;
      };
    }
  | { error: string }
>({
  description:
    "Fetch daily Islamic prayer times for a location using latitude and longitude.",
  inputSchema: prayersToolInputSchema,
  execute: async ({ latitude, longitude, date, method }) => {
    try {
      const config = new Configuration({
        ...(process.env.PRAYERS_API_BASE_URL
          ? { basePath: process.env.PRAYERS_API_BASE_URL }
          : {}),
      });
      const api = new DailyPrayerTimesApi(config);

      const response = await api.dailyPrayerTimesForDate({
        date: formatDateForApi(date),
        latitude: String(latitude),
        longitude: String(longitude),
        ...(method !== undefined ? { method } : {}),
      });

      console.log({ PrayersApiResponse: JSON.stringify(response)})

      return {
        date: response.data?.date?.gregorian?.date ?? formatDateForApi(date),
        timezone: response.data?.meta?.timezone,
        timings: response?.data?.timings,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to fetch prayer times",
      };
    }
  },
});

