export default function PageBackdrop({
  className,
}: {
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 opacity-[0.3] dark:opacity-35 ${
        className ?? ""
      }`}
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        maskImage:
          "radial-gradient(ellipse 90% 85% at 50% 45%, black 35%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 90% 85% at 50% 45%, black 35%, transparent 100%)",
      }}
    />
  )
}
