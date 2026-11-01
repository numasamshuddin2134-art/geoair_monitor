import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { geocodingProvider } from "@/lib/providers/geocoding";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().min(1).max(20).default(8),
});

const ReverseSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Reverse geocoding path
    if (searchParams.has("lat") && searchParams.has("lng")) {
      const parsed = ReverseSchema.safeParse({
        lat: searchParams.get("lat"),
        lng: searchParams.get("lng"),
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid coordinate parameters", details: parsed.error.issues },
          { status: 400 }
        );
      }

      const result = await geocodingProvider.reverse(parsed.data.lat, parsed.data.lng);
      return NextResponse.json({ success: true, location: result });
    }

    // Forward search path
    const parsed = QuerySchema.safeParse({
      q: searchParams.get("q") || "",
      limit: searchParams.get("limit") || 8,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Query parameter 'q' must be at least 2 characters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const results = await geocodingProvider.search(parsed.data.q, parsed.data.limit);
    return NextResponse.json({ success: true, count: results.length, results });
  } catch (error: any) {
    console.error("[API/geocode] Server error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred during geocoding" },
      { status: 500 }
    );
  }
}
