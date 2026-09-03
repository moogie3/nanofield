import Image from "next/image"
import { Heading } from "@modules/common/components/ui"
import { Button } from "@/components/ui/button"
const Hero = () => {
  return (
    <div className="h-[75vh] w-full border-b border-border relative bg-background overflow-hidden">
      <Image
        src="/background.jpeg"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center small:p-32 gap-6">
        <span>
          <h1 className="mb-4 flex justify-center">
            <Image
              src="/nanofield.jpg"
              alt="Nanofield"
              width={640}
              height={160}
              priority
              className="h-20 sm:h-28 w-auto rounded-2xl shadow-xl"
            />
          </h1>
          <Heading
            level="h2"
            className="text-xl leading-8 text-white/80 font-normal max-w-2xl mx-auto"
          >
            Precision Electronic Components & Appliance Spare Parts.{" "}
            <br className="hidden sm:block" />
            Search by IC part number, browse datasheets, and check real-time
            B2B/B2C stock.
          </Heading>
        </span>
        <div className="flex gap-4">
          <Button
            asChild
            size="lg"
            className="font-bold tracking-widest uppercase px-8"
          >
            <a href="/store">Enter Catalog</a>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Hero
