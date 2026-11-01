import { NextRequest, NextResponse } from "next/server";
import { generateComparativeBrief } from "@/lib/ai/compareGemini";
import { EnvironmentalProfile } from "@/lib/types/environmental";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ready",
    service: "GeoAir Multi-Sector Comparative Intelligence Brief",
    provider: "Google Gemini 3.5 Flash",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const profiles: EnvironmentalProfile[] = body?.profiles || [];

    if (!Array.isArray(profiles) || profiles.length < 2) {
      return NextResponse.json(
        { error: "Comparative analysis requires at least 2 environmental profiles." },
        { status: 400 }
      );
    }

    const comparativeBrief = await generateComparativeBrief(profiles);
    return NextResponse.json({ success: true, data: comparativeBrief });
  } catch (error: any) {
    console.error("[API/analyze/compare] POST error:", error);
    return NextResponse.json(
      { error: "Failed to generate comparative intelligence brief", details: error.message },
      { status: 500 }
    );
  }
}
