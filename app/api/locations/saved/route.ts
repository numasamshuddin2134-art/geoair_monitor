import { NextRequest, NextResponse } from "next/server";
import { firebaseLocations } from "@/lib/database/savedLocations";
import { z } from "zod";

export const dynamic = "force-dynamic";

const SaveLocationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  country: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const locations = await firebaseLocations.getSavedLocations();
    return NextResponse.json({ success: true, data: locations });
  } catch (error: any) {
    console.error("[API/locations/saved] GET error:", error);
    return NextResponse.json({ error: "Failed to retrieve saved locations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SaveLocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, name, latitude, longitude, country, notes } = parsed.data;
    const finalId = id || `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const saved = await firebaseLocations.saveLocation({
      id: finalId,
      name,
      latitude,
      longitude,
      country,
      notes,
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    console.error("[API/locations/saved] POST error:", error);
    return NextResponse.json({ error: "Failed to save location" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {
        // no body
      }
    }

    if (!id) {
      return NextResponse.json({ error: "Location id is required to delete" }, { status: 400 });
    }

    await firebaseLocations.deleteLocation(id);
    return NextResponse.json({ success: true, message: `Location ${id} deleted` });
  } catch (error: any) {
    console.error("[API/locations/saved] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete location" }, { status: 500 });
  }
}
