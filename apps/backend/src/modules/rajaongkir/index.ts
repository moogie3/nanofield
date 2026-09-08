import { Module } from "@medusajs/framework/utils"
import RajaongkirModuleService from "./service"

export const RAJAONGKIR_MODULE = "rajaongkir"

export default Module(RAJAONGKIR_MODULE, {
  service: RajaongkirModuleService,
})
