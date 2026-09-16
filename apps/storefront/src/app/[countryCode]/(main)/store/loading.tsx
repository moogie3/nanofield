import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"

// Instant skeleton paint on first load / filter navigations — the grid
// streams in behind it instead of a blank page.
export default function StoreLoading() {
  return (
    <div className="content-container py-6" data-testid="store-loading">
      <SkeletonProductGrid numberOfProducts={16} />
    </div>
  )
}
