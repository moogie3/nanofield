import { listCategories } from "@lib/data/categories"
import { getCacheOptions } from "@lib/data/cookies"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const next = {
      ...(await getCacheOptions("categories")),
    }

    const categories = await listCategories({ limit: 200 })
    return NextResponse.json(categories || [])
  } catch (error) {
    console.error("Failed to fetch categories", error)
    return NextResponse.json([], { status: 500 })
  }
}
