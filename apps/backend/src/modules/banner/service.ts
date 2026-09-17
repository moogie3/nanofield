import { MedusaService } from "@medusajs/framework/utils"
import { Banner } from "./models/banner"

// CRUD surface for storefront banners. Generated methods used:
// listBanners, createBanners, updateBanners, deleteBanners. The active
// filter (published + within dates) lives in the store route so both the
// storefront and any future surface share one definition.
class BannerModuleService extends MedusaService({
  Banner,
}) {}

export default BannerModuleService
