import { NextRequest, NextResponse } from "next/server";
import { firebaseLocations, RecentQuery } from "@/lib/database/savedLocations";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RecentQuerySchema = z.object({
  query: z.string().min(1),
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "8", 10);
    const recent = await firebaseLocations.getRecentQueries(limit);
    return NextResponse.json({ success: true, data: recent });
  } catch (error: any) {
    console.error("[API/locations/recent] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch recent queries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RecentQuerySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const item: RecentQuery = {
      ...parsed.data,
      timestamp: new Date().toISOString(),
    };

    await firebaseLocations.logRecentQuery(item);
    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    console.error("[API/locations/recent] POST error:", error);
    return NextResponse.json({ error: "Failed to log recent query" }, { status: 500 });
  }
}
