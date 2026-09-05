import { Container, clx } from "@modules/common/components/ui"
import Image from "next/image"
import React from "react"

import DefaultProductImage, {
  DefaultProductImageSize,
} from "@modules/products/components/default-product-image"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: { url?: string }[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  className?: string
  placeholderSize?: DefaultProductImageSize
  showPlaceholderLabel?: boolean
  "data-testid"?: string
}

const defaultPlaceholderSizeForThumbnail: Record<
  NonNullable<ThumbnailProps["size"]>,
  DefaultProductImageSize
> = {
  small: "xs",
  medium: "sm",
  large: "md",
  full: "md",
  square: "sm",
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  isFeatured,
  className,
  placeholderSize,
  showPlaceholderLabel,
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url

  const aspectAndWidth = {
    "aspect-[11/14]": isFeatured,
    "aspect-[9/16]": !isFeatured && size !== "square",
    "aspect-[1/1]": size === "square",
    "w-[180px]": size === "small",
    "w-[290px]": size === "medium",
    "w-[440px]": size === "large",
    "w-full": size === "full",
  }

  // No photo: render just the icon on a bare transparent box (a plain div,
  // not Container, which bakes in its own bg/padding). No "square in a
  // square" in either theme.
  if (!initialImage) {
    return (
      <div
        className={clx(
          "relative w-full overflow-hidden bg-transparent",
          className,
          aspectAndWidth
        )}
        data-testid={dataTestid}
      >
        <DefaultProductImage
          className="absolute inset-0"
          size={placeholderSize ?? defaultPlaceholderSizeForThumbnail[size]}
          showLabel={showPlaceholderLabel}
        />
      </div>
    )
  }

  return (
    <Container
      className={clx(
        "relative w-full overflow-hidden p-4 bg-ui-bg-subtle dark:bg-muted shadow-elevation-card-rest rounded-large group-hover:shadow-elevation-card-hover transition-shadow ease-in-out duration-150",
        className,
        aspectAndWidth
      )}
      data-testid={dataTestid}
    >
      <Image
        src={initialImage}
        alt="Thumbnail"
        className="absolute inset-0 object-cover object-center"
        draggable={false}
        quality={50}
        sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
        fill
      />
    </Container>
  )
}

export default Thumbnail
