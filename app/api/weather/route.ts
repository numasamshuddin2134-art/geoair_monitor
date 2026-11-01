import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { weatherProvider } from "@/lib/providers/weather";

export const dynamic = "force-dynamic";

const CoordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = CoordinatesSchema.safeParse({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid coordinates", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = await weatherProvider.getWeather(parsed.data.lat, parsed.data.lng);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[API/weather] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather telemetry" },
      { status: 500 }
    );
  }
}
