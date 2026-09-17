import { MedusaService } from "@medusajs/framework/utils"
import { SenderProfile } from "./models/sender-profile"

// CRUD surface for the store sender block. Generated methods used:
// listSenderProfiles, createSenderProfiles, updateSenderProfiles.
// Singleton by convention (first row wins) — enforced by callers.
class SenderProfileModuleService extends MedusaService({
  SenderProfile,
}) {}

export default SenderProfileModuleService
