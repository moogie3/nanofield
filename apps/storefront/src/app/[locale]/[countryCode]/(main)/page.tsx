import { Metadata } from "next"
import { pageMeta } from "@lib/util/locale-metadata"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import NewArrivals from "@modules/home/components/new-arrivals"
import StoreBanners from "@modules/common/components/store-banners"
import { listCollections } from "@lib/data/collections"
import { getSiteSettings } from "@lib/data/content"
import { getRegion } from "@lib/data/regions"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>
}): Promise<Metadata> {
  const { locale, countryCode } = await params
  return pageMeta(locale, countryCode, "", "homeTitle", "homeDesc")
}

export default async function Home(props: {
  params: Promise<{ locale: string; countryCode: string }>
}) {
  const params = await props.params

  const { countryCode, locale } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  const settings = await getSiteSettings(locale)

  if (!collections || !region) {
    return null
  }

  return (
    <>
      <Hero
        content={{
          badge: settings["home.hero.badge"],
          subtitle: settings["home.hero.subtitle"],
          ctaLabel: settings["home.hero.ctaLabel"],
        }}
      />
      <StoreBanners />
      <NewArrivals region={region} countryCode={countryCode} />
      <div className="py-12">
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </>
  )
}
