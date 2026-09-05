import { clx } from "@modules/common/components/ui"

export type DefaultProductImageSize = "xs" | "sm" | "md" | "lg" | "card"

const sizeStyles: Record<DefaultProductImageSize, string> = {
  // Percent keeps the mark proportional to its container, max-w caps it on
  // large surfaces (e.g. product detail gallery) so it never looks oversized.
  xs: "w-[72%] max-w-[52px]",
  sm: "w-[68%] max-w-[104px]",
  // Slightly smaller than sm — product card grids (homepage, catalog).
  card: "w-[55%] max-w-[84px]",
  md: "w-[60%] max-w-[148px]",
  lg: "w-[46%] max-w-[220px]",
}

export default function DefaultProductImage({
  className,
  size = "md",
  showLabel,
}: {
  className?: string
  size?: DefaultProductImageSize
  showLabel?: boolean
}) {
  // Tiny thumbnails (cart rows, dropdowns) can't render the wordmark legibly.
  const renderLabel = showLabel ?? size !== "xs"

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent ${
        className ?? ""
      }`}
    >
      <svg
        // ViewBox is padded beyond the 120x84 artwork because the inner
        // group is scaled 1.35x about the center — without the padding the
        // chip top and the wordmark edges get clipped.
        viewBox="-4 -8 128 96"
        className={clx("h-auto shrink-0 text-muted-foreground", sizeStyles[size])}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <g transform="translate(60 44) scale(1.35) translate(-60 -44)">
          <g
            className="text-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="48" y="8" width="24" height="34" rx="2" />
            <circle cx="60" cy="14" r="2" fill="currentColor" stroke="none" />
            <path d="M38 18 H48 M38 26 H48 M38 34 H48 M72 18 H82 M72 26 H82 M72 34 H82" />
          </g>
          {renderLabel && (
            <text
              x="60"
              y="70"
              textAnchor="middle"
              fontSize="10"
              letterSpacing="3"
              fill="currentColor"
              textLength="92"
              lengthAdjust="spacingAndGlyphs"
              fontFamily="ui-monospace, monospace"
            >
              NANOFIELD
            </text>
          )}
        </g>
      </svg>
    </div>
  )
}
