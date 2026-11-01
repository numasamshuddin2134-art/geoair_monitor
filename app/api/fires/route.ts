import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { firmsFireProvider } from "@/lib/providers/fires";

export const dynamic = "force-dynamic";

const BboxSchema = z.object({
  minLng: z.coerce.number().min(-180).max(180),
  minLat: z.coerce.number().min(-90).max(90),
  maxLng: z.coerce.number().min(-180).max(180),
  maxLat: z.coerce.number().min(-90).max(90),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // If point with delta is provided instead of bbox
    if (searchParams.has("lat") && searchParams.has("lng")) {
      const lat = parseFloat(searchParams.get("lat")!);
      const lng = parseFloat(searchParams.get("lng")!);
      const delta = parseFloat(searchParams.get("delta") || "2.0");

      const data = await firmsFireProvider.getFiresInBbox(
        lng - delta,
        lat - delta,
        lng + delta,
        lat + delta
      );
      return NextResponse.json({ success: true, data });
    }

    const parsed = BboxSchema.safeParse({
      minLng: searchParams.get("minLng"),
      minLat: searchParams.get("minLat"),
      maxLng: searchParams.get("maxLng"),
      maxLat: searchParams.get("maxLat"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid bbox parameters (minLng, minLat, maxLng, maxLat)", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = await firmsFireProvider.getFiresInBbox(
      parsed.data.minLng,
      parsed.data.minLat,
      parsed.data.maxLng,
      parsed.data.maxLat
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[API/fires] Error:", error);
    return NextResponse.json({ error: "Failed to query NASA FIRMS active fires" }, { status: 500 });
  }
}
