import { Heading, Text } from "@modules/common/components/ui"

type PageHeaderProps = {
  eyebrow: string
  title: string
  subtitle: string
}

// Shared title + pretitle block for the support pages (contact, returns,
// FAQ), account pages, cart, and checkout — one style everywhere.
//
// Single wrapping div on purpose: as a fragment, the eyebrow/title/subtitle
// became flex items of whatever parent wrapped them, so a parent gap-y-*
// pried them apart (the account pages drifted this way). This div makes the
// tight overview-style stack immune to parent gaps. Title scale matches the
// account overview header (text-3xl-regular).
const PageHeader = ({ eyebrow, title, subtitle }: PageHeaderProps) => {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ui-fg-subtle">
        {eyebrow}
      </span>
      <Heading level="h1" className="text-3xl-regular">
        {title}
      </Heading>
      <Text className="text-base-regular max-w-2xl text-ui-fg-subtle">
        {subtitle}
      </Text>
    </div>
  )
}

export default PageHeader
