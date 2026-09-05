import { NANOFIELD_AVATAR_SVG } from "../lib/brand-dom"

/**
 * Nanofield avatar mark for React trees (topbar badge, etc.).
 * Same artwork the DOM helpers stamp into the stock avatar slots.
 */
export const NanofieldAvatar = ({ className }: { className?: string }) => {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
      // Static brand artwork, shared with brand-dom.ts — keep in sync.
      dangerouslySetInnerHTML={{ __html: NANOFIELD_AVATAR_SVG }}
      aria-label="Nanofield"
    />
  )
}
