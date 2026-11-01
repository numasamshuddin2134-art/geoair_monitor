import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { historicalProvider } from "@/lib/providers/history";

export const dynamic = "force-dynamic";

const HistoryQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  range: z.enum(["7d", "30d", "90d"]).default("7d"),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = HistoryQuerySchema.safeParse({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
      range: searchParams.get("range") || "7d",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid history query parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = await historicalProvider.getHistory(parsed.data.lat, parsed.data.lng, parsed.data.range);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[API/history] Error:", error);
    return NextResponse.json({ error: "Failed to fetch historical trends" }, { status: 500 });
  }
}
