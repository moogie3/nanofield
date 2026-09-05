"use client"

import { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { Container } from "@modules/common/components/ui"
import DefaultProductImage from "@modules/products/components/default-product-image"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!images.length) {
    return (
      <div className="flex items-start relative">
        <div className="flex flex-col w-full max-w-xl mx-auto gap-y-4">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-large border border-border bg-card">
            <DefaultProductImage size="lg" />
          </div>
        </div>
      </div>
    )
  }

  const total = images.length
  const showControls = total > 1
  const goTo = (index: number) =>
    setActiveIndex(((index % total) + total) % total)
  const active = images[activeIndex]

  return (
    <div className="flex items-start relative">
      <div className="flex flex-col w-full max-w-xl mx-auto gap-y-4">
        <Container
          key={active?.id ?? activeIndex}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-large border border-border bg-ui-bg-subtle"
          id={active?.id}
        >
          {!!active?.url && (
            <Image
              src={active.url}
              priority
              className="absolute inset-0 rounded-rounded"
              alt={`Product image ${activeIndex + 1} of ${total}`}
              fill
              sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
              style={{
                objectFit: "cover",
              }}
            />
          )}
          {showControls && (
            <>
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur transition hover:bg-background"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                aria-label="Next image"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur transition hover:bg-background"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </button>
              <span className="absolute bottom-2 right-2 rounded-full bg-background/80 px-2 py-0.5 font-mono text-[11px] tabular-nums backdrop-blur">
                {activeIndex + 1} / {total}
              </span>
              <span className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
                {images.map((image, index) => (
                  <button
                    key={image.id ?? index}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Go to image ${index + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      index === activeIndex
                        ? "w-5 bg-primary"
                        : "w-1.5 bg-foreground/30 hover:bg-foreground/50"
                    }`}
                  />
                ))}
              </span>
            </>
          )}
        </Container>
      </div>
    </div>
  )
}

export default ImageGallery
