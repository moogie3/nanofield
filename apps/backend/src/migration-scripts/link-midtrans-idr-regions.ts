import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

// Links the Midtrans payment provider to every IDR region.
//
// Region -> payment-provider links are database rows, so `git pull` never
// carries them over: a fresh clone (or a region created later via Admin)
// offers only manual payment until Midtrans is ticked for the region.
// This script runs once per database through `medusa db:migrate` and
// tolerates an already-present link, so re-running is always safe.
// Scoped to IDR regions because Midtrans settles in IDR.
const MIDTRANS_PROVIDER_ID = "pp_midtrans_midtrans"

export default async function linkMidtransIdrRegions({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: providers } = await query.graph({
    entity: "payment_provider",
    filters: { id: MIDTRANS_PROVIDER_ID, is_enabled: true },
    fields: ["id"],
  })

  if (!providers.length) {
    logger.warn(
      `Skipping Midtrans region link: provider ${MIDTRANS_PROVIDER_ID} is not installed or not enabled.`
    )
    return
  }

  const { data: regions } = await query.graph({
    entity: "region",
    filters: { currency_code: "idr" },
    fields: ["id", "name", "currency_code"],
  })

  if (!regions.length) {
    logger.info("Skipping Midtrans region link: no IDR regions found.")
    return
  }

  for (const region of regions) {
    try {
      await link.create({
        [Modules.REGION]: { region_id: region.id },
        [Modules.PAYMENT]: { payment_provider_id: MIDTRANS_PROVIDER_ID },
      })
      logger.info(
        `Linked Midtrans provider to region ${region.name} (${region.id}).`
      )
    } catch (err) {
      // Link already exists (e.g. ticked manually via Admin): not an error.
      if (
        err instanceof Error &&
        /duplicate|unique|already exists/i.test(err.message)
      ) {
        logger.info(
          `Midtrans already linked to region ${region.name} (${region.id}), skipping.`
        )
        continue
      }
      throw err
    }
  }
}
