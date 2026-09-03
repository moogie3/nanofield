import { Github } from "@medusajs/icons"
import { Button, Heading } from "@modules/common/components/ui"
const Hero = () => {
  return (
    <div className="h-[75vh] w-full border-b border-border relative bg-background">
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center small:p-32 gap-6">
        <span>
          <Heading
            level="h1"
            className="text-4xl leading-10 text-primary font-heading font-bold uppercase tracking-wider mb-4"
          >
            Nanofield
          </Heading>
          <Heading
            level="h2"
            className="text-xl leading-8 text-ui-fg-subtle font-normal max-w-2xl mx-auto"
          >
            Precision Electronic Components & Appliance Spare Parts.{" "}
            <br className="hidden sm:block" />
            Search by IC part number, browse datasheets, and check real-time
            B2B/B2C stock.
          </Heading>
        </span>
        <div className="flex gap-4">
          <a href="/store">
            <Button
              variant="secondary"
              className="rounded-none border-primary text-primary hover:bg-primary hover:text-black transition-colors font-bold tracking-widest uppercase px-8"
            >
              Enter Catalog
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}

export default Hero
