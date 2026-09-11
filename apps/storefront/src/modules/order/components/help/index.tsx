import { Heading } from "@modules/common/components/ui"
import InteractiveLink from "@modules/common/components/interactive-link"
import React from "react"

const Help = () => {
  return (
    <div className="mt-6">
      <Heading className="text-base-semi">Need help?</Heading>
      <div className="text-base-regular my-2">
        <ul className="gap-y-2 flex flex-col">
          <li>
            <InteractiveLink href="/contact">Contact</InteractiveLink>
          </li>
          <li>
            <InteractiveLink href="/returns">
              Returns & Exchanges
            </InteractiveLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help
