"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import {
  ChipIcon,
  CircuitBoardIcon,
  FaceIdIcon,
  MenuCircleIcon,
  PackageIcon,
  ShoppingBag01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons"

export function MenuNavIcon({ className }: { className?: string }) {
  return (
    <HugeiconsIcon
      icon={MenuCircleIcon}
      strokeWidth={2}
      className={className ?? "h-6 w-6"}
    />
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
