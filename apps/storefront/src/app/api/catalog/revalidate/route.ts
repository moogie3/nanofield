import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

// Called by the Medusa backend (product subscriber) after catalog changes.
// Full-layout revalidation: catalog edits are batched imports, not
// per-second events, so purging everything is correct and simple.
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  revalidatePath("/", "layout")

  return NextResponse.json({ revalidated: true })
}
