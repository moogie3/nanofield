import { Heading, Text } from "@modules/common/components/ui"
import {
  parseContentBlocks,
  type ContentBlock,
} from "@lib/util/content-blocks"

// Renders a CMS page body (plain text, see parseContentBlocks for the block
// convention) using the same card/list/heading styling as the built-in support
// pages, so admin-authored content is visually indistinguishable from content
// that shipped in code.
const Block = ({ block }: { block: ContentBlock }) => {
  switch (block.type) {
    case "heading":
      return (
        <Heading level="h2" className="text-xl-semi">
          {block.text}
        </Heading>
      )
    case "subheading":
      return (
        <Heading level="h3" className="text-base-semi">
          {block.text}
        </Heading>
      )
    case "list":
      return (
        <ul className="flex flex-col gap-y-2 text-small-regular text-ui-fg-subtle list-disc pl-5">
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )
    case "qa":
      return (
        <div className="grid gap-4 small:grid-cols-2">
          {block.items.map((item, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-2xl p-6"
            >
              <Heading level="h3" className="text-base-semi">
                {item.q}
              </Heading>
              <Text className="text-small-regular mt-2 text-ui-fg-subtle">
                {item.a}
              </Text>
            </div>
          ))}
        </div>
      )
    case "paragraph":
    default:
      return (
        <Text className="text-small-regular text-ui-fg-subtle">
          {block.text}
        </Text>
      )
  }
}

const ContentBlocks = ({
  body,
  className,
}: {
  body: string
  className?: string
}) => {
  const blocks = parseContentBlocks(body)
  if (!blocks.length) {
    return null
  }
  return (
    <div className={["flex flex-col gap-y-6", className].filter(Boolean).join(" ")}>
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  )
}

export default ContentBlocks
