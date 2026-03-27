import { NextRequest, NextResponse } from "next/server";
import { getCatalogues, getCatalogueById, incrementCatalogueViews } from "@/lib/catalogue-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const view = searchParams.get("view"); // track view

    if (id) {
      const catalogue = await getCatalogueById(id);
      if (!catalogue) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      // Only show published catalogues to public
      if (catalogue.status !== "published") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (view === "1") {
        await incrementCatalogueViews(id);
      }
      return NextResponse.json(catalogue);
    }

    const catalogues = await getCatalogues(true); // only published
    return NextResponse.json({ catalogues });
  } catch (err) {
    console.error("[api/catalogue] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
