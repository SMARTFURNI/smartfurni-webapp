import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getCatalogues,
  getCatalogueById,
  createCatalogue,
  updateCatalogue,
  deleteCatalogue,
  addCataloguePage,
  updateCataloguePage,
  deleteCataloguePage,
  reorderCataloguePages,
} from "@/lib/catalogue-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const catalogue = await getCatalogueById(id);
      if (!catalogue) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(catalogue);
    }

    const catalogues = await getCatalogues(false); // all, including drafts
    return NextResponse.json({ catalogues });
  } catch (err) {
    console.error("[api/admin/catalogue] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { action } = body;

    if (action === "create-catalogue") {
      const cat = await createCatalogue({
        title: body.title || "Catalogue mới",
        description: body.description || "",
        coverImageUrl: body.coverImageUrl || "",
        status: body.status || "draft",
      });
      return NextResponse.json(cat);
    }

    if (action === "update-catalogue") {
      await updateCatalogue(body.id, {
        title: body.title,
        description: body.description,
        coverImageUrl: body.coverImageUrl,
        status: body.status,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete-catalogue") {
      await deleteCatalogue(body.id);
      return NextResponse.json({ ok: true });
    }

    if (action === "add-page") {
      const page = await addCataloguePage(body.catalogueId, {
        type: body.type || "content",
        title: body.title || "",
        subtitle: body.subtitle || "",
        imageUrl: body.imageUrl || "",
        bgColor: body.bgColor || "#1a1a1a",
        textColor: body.textColor || "#ffffff",
        content: body.content || "",
        productIds: body.productIds || [],
        badge: body.badge || "",
      });
      return NextResponse.json(page);
    }

    if (action === "update-page") {
      await updateCataloguePage(body.pageId, {
        type: body.type,
        title: body.title,
        subtitle: body.subtitle,
        imageUrl: body.imageUrl,
        bgColor: body.bgColor,
        textColor: body.textColor,
        content: body.content,
        productIds: body.productIds,
        badge: body.badge,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete-page") {
      await deleteCataloguePage(body.pageId);
      return NextResponse.json({ ok: true });
    }

    if (action === "reorder-pages") {
      await reorderCataloguePages(body.catalogueId, body.pageIds);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[api/admin/catalogue] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
