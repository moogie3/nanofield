// Parses the CMS page body's plain-text block convention into renderable
// blocks. Kept dependency-free and pure so the storefront renderer stays a thin
// map over the result, and so the rules are easy to reason about in one place.
//
//   ## Heading              -> section heading
//   ### Heading             -> sub-heading
//   - item / * item         -> bullet list (consecutive lines merge)
//   Q: question             -> question/answer card; the next line must be
//     A: answer                "A: answer" (consecutive pairs merge into a row)
//   anything else           -> paragraph (consecutive lines merge); a blank
//                              line ends the current block
export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "qa"; items: { q: string; a: string }[] }

export function parseContentBlocks(body: string): ContentBlock[] {
  const lines = (body ?? "").replace(/\r\n/g, "\n").split("\n")
  const blocks: ContentBlock[] = []
  let para: string[] = []
  let list: string[] = []
  let qa: { q: string; a: string }[] = []

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "paragraph", text: para.join(" ") })
      para = []
    }
  }
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: list })
      list = []
    }
  }
  const flushQa = () => {
    if (qa.length) {
      blocks.push({ type: "qa", items: qa })
      qa = []
    }
  }
  const flushAll = () => {
    flushPara()
    flushList()
    flushQa()
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (!line) {
      flushAll()
      continue
    }
    if (line.startsWith("## ")) {
      flushAll()
      blocks.push({ type: "heading", text: line.slice(3).trim() })
      continue
    }
    if (line.startsWith("### ")) {
      flushAll()
      blocks.push({ type: "subheading", text: line.slice(4).trim() })
      continue
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushPara()
      flushQa()
      list.push(line.slice(2).trim())
      continue
    }
    if (line.startsWith("Q: ")) {
      flushPara()
      flushList()
      const q = line.slice(3).trim()
      const next = (lines[i + 1] ?? "").trim()
      if (q && next.startsWith("A: ")) {
        qa.push({ q, a: next.slice(3).trim() })
        i++
        continue
      }
      // A question without an answer renders as a sub-heading rather than
      // swallowing the following lines.
      flushQa()
      blocks.push({ type: "subheading", text: q })
      continue
    }

    flushList()
    flushQa()
    para.push(line)
  }

  flushAll()
  return blocks
}
