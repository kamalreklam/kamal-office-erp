import { NextRequest, NextResponse } from "next/server";
import { renameProductCascade } from "@/lib/server/product-rename";

export async function POST(req: NextRequest) {
  try {
    const { productId, newName } = await req.json();
    if (typeof productId !== "string" || !productId || typeof newName !== "string" || !newName.trim()) {
      return NextResponse.json({ error: "productId و newName مطلوبان" }, { status: 400 });
    }
    const result = await renameProductCascade(productId, newName);
    if ("error" in result) return NextResponse.json(result, { status: 404 });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "فشل تحديث اسم المنتج", details: message }, { status: 500 });
  }
}
