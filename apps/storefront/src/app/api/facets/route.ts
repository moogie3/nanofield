import { getFilterFacets } from "@lib/data/products"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const categoryIds = request.nextUrl.searchParams.getAll("category_id")
    const facets = await getFilterFacets(categoryIds)
    return NextResponse.json(facets)
  } catch (error) {
    console.error("Failed to fetch facets", error)
    return NextResponse.json(
      { options: [], specs: [], datasheetCount: 0 },
      { status: 500 }
    )
  }
}
