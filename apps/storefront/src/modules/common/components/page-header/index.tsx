import { Heading, Text } from "@modules/common/components/ui"

type PageHeaderProps = {
  eyebrow: string
  title: string
  subtitle: string
}

// Shared title + pretitle block for the support pages (contact, returns,
// FAQ) and error-adjacent info pages — one style everywhere.
const PageHeader = ({ eyebrow, title, subtitle }: PageHeaderProps) => {
  return (
    <>
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ui-fg-subtle">
        {eyebrow}
      </span>
      <Heading level="h1" className="text-2xl-semi">
        {title}
      </Heading>
      <Text className="text-base-regular max-w-2xl text-ui-fg-subtle">
        {subtitle}
      </Text>
    </>
  )
}

export default PageHeader
