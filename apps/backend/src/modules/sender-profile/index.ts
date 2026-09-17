import { Module } from "@medusajs/framework/utils"
import SenderProfileModuleService from "./service"

export const SENDER_PROFILE_MODULE = "sender_profile"

export default Module(SENDER_PROFILE_MODULE, {
  service: SenderProfileModuleService,
})
