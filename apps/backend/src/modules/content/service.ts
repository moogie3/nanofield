import { MedusaService } from "@medusajs/framework/utils"
import { SiteSetting } from "./models/site-setting"
import { ContentPage } from "./models/content-page"

// CRUD surface for storefront content: settings (SiteSetting) and long-form
// pages (ContentPage). Generated methods used: listSiteSettings,
// createSiteSettings, updateSiteSettings, deleteSiteSettings, and the same
// set for ContentPage. The locale fallback (en over id) and the published
// filter live in the store routes so every surface shares one definition.
class ContentModuleService extends MedusaService({
  SiteSetting,
  ContentPage,
}) {}

export default ContentModuleService
