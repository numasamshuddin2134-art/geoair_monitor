import { NextRequest, NextResponse } from "next/server";
import { generateAnalystBrief } from "@/lib/ai/gemini";
import { EnvironmentalProfile } from "@/lib/types/environmental";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ready",
    service: "GeoAir AI Analyst Brief",
    provider: "Google Gemini 3.5 Flash",
  });
}

export async function POST(req: NextRequest) {
  try {
    const profile: EnvironmentalProfile = await req.json();

    if (!profile || !profile.airQuality || !profile.weather) {
      return NextResponse.json(
        { error: "Invalid payload: EnvironmentalProfile is required" },
        { status: 400 }
      );
    }

    const brief = await generateAnalystBrief(profile);
    return NextResponse.json({ success: true, data: brief });
  } catch (error: any) {
    console.error("[API/analyze] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI analyst brief" },
      { status: 500 }
    );
  }
}
