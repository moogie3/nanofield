import repeat from "@lib/util/repeat"
import SkeletonProductPreview from "@modules/skeletons/components/skeleton-product-preview"

const SkeletonProductGrid = ({
  numberOfProducts = 8,
}: {
  numberOfProducts?: number
}) => {
  return (
    <div>
      <div
        className="mb-6 flex items-center gap-3"
        aria-hidden
        data-testid="products-list-loader-beacon"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Scanning catalog
        </span>
        <span className="relative h-px flex-1 overflow-hidden bg-border">
          <span className="animate-hero-scanline absolute inset-y-0 w-1/3 bg-primary" />
        </span>
      </div>
      <ul
        className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8 flex-1"
        data-testid="products-list-loader"
      >
        {repeat(numberOfProducts).map((index) => (
          <li key={index}>
            <SkeletonProductPreview />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SkeletonProductGrid
