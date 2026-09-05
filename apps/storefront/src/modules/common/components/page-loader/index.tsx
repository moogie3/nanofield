export default function PageLoader({
  label = "Loading",
}: {
  label?: string
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
      </span>
      <p className="font-mono text-sm uppercase tracking-[0.35em] text-muted-foreground">
        {label}
      </p>
      <span className="relative h-px w-72 overflow-hidden bg-border">
        <span className="animate-hero-scanline absolute inset-y-0 w-1/3 bg-primary" />
      </span>
    </div>
  )
}
