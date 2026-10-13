// Brand mark: the login avatar blobs wrapped in a thin rounded-square
// outline. Hover choreography ("ignition draw-on", driven by the nearest
// `group` ancestor — the navbar link): the frame draws itself clockwise,
// then the nodes ignite blue -> coral -> green with matching glows. All
// CSS-only; motion-reduce users keep the static lockup.
const MARK_VIEWBOX = "0 0 56 52"

export const NanofieldMark = ({
  className = "",
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) => {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="3"
        y="3"
        width="50"
        height="46"
        rx="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        pathLength={1}
        className="transition-[stroke-dashoffset] duration-500 ease-out [stroke-dasharray:1] [stroke-dashoffset:1] group-hover:[stroke-dashoffset:0] motion-reduce:transition-none"
      />
      <circle
        cx="17"
        cy="29"
        r="8.5"
        fill="#2B8DC4"
        className="transition-all duration-300 group-hover:[filter:drop-shadow(0_0_6px_#2B8DC4)] group-hover:delay-300 motion-reduce:transition-none"
      />
      <circle
        cx="28"
        cy="29"
        r="8.5"
        fill="#E6654F"
        className="transition-all duration-300 group-hover:[filter:drop-shadow(0_0_6px_#E6654F)] group-hover:delay-500 motion-reduce:transition-none"
      />
      <circle
        cx="38"
        cy="27"
        r="9"
        fill="#2C8869"
        className="transition-all duration-300 group-hover:[filter:drop-shadow(0_0_6px_#2C8869)] group-hover:delay-700 motion-reduce:transition-none"
      />
      <circle cx="40" cy="20" r="5.5" fill="#2C8869" />
    </svg>
  )
}
