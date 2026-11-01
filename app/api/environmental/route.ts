import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { environmentalProvider } from "@/lib/providers/environmental";

export const dynamic = "force-dynamic";

const PointQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  name: z.string().optional(),
});

const PolygonQuerySchema = z.object({
  coordinates: z.array(z.array(z.number())).min(3),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = PointQuerySchema.safeParse({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
      name: searchParams.get("name") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid coordinate parameters. 'lat' and 'lng' are required.", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = await environmentalProvider.getPointProfile(
      parsed.data.lat,
      parsed.data.lng,
      parsed.data.name
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[API/environmental] Point query error:", error);
    return NextResponse.json({ error: "Failed to fetch environmental intelligence profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PolygonQuerySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid polygon payload. Must provide an array of coordinates.", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = await environmentalProvider.getPolygonProfile(parsed.data.coordinates);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[API/environmental] Polygon query error:", error);
    return NextResponse.json({ error: "Failed to process polygon area intelligence" }, { status: 500 });
  }
}
