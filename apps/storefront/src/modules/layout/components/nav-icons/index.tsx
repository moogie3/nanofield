"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import {
  ChipIcon,
  CircuitBoardIcon,
  FaceIdIcon,
  PackageIcon,
  ShoppingBag01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons"

export function MenuNavIcon({
  className,
  open,
}: {
  className?: string
  open?: boolean
}) {
  const bar =
    "absolute h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
  return (
    <span
      className={`relative flex h-6 w-6 items-center justify-center transition-transform duration-300 ${
        open ? "rotate-90 scale-110" : "rotate-0 scale-100"
      } ${className ?? ""}`}
    >
      <span
        className={`${bar} ${
          open ? "translate-y-0 rotate-45" : "-translate-y-[4px] rotate-0"
        }`}
      />
      <span
        className={`${bar} ${
          open ? "translate-y-0 -rotate-45" : "translate-y-[4px] rotate-0"
        }`}
      />
    </span>
  )
}

export function AccountNavIcon({ className }: { className?: string }) {
  return (
    <HugeiconsIcon
      icon={UserCircleIcon}
      strokeWidth={2}
      className={className ?? "h-6 w-6"}
    />
  )
}

export function CartNavIcon({
  count,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <span className="relative flex items-center">
      <HugeiconsIcon
        icon={ShoppingBag01Icon}
        strokeWidth={2}
        className={className ?? "h-6 w-6"}
      />
      {!!count && count > 0 && (
        <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {count}
        </span>
      )}
    </span>
  )
}

export function SectionIcon({
  icon,
  className,
}: {
  icon: IconSvgElement
  className?: string
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      strokeWidth={2}
      className={className ?? "h-5 w-5 shrink-0 text-primary"}
    />
  )
}

export const SideMenuIcons = {
  Home: ChipIcon,
  Store: CircuitBoardIcon,
  Account: FaceIdIcon,
  Cart: PackageIcon,
} as const

export function SideMenuItemIcon({
  name,
}: {
  name: keyof typeof SideMenuIcons
}) {
  return (
    <HugeiconsIcon
      icon={SideMenuIcons[name]}
      strokeWidth={2}
      className="h-7 w-7 shrink-0 opacity-70"
    />
  )
}
