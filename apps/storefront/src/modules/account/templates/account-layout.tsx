import React from "react"
import { getTranslations } from "next-intl/server"

import UnderlineLink from "@modules/common/components/interactive-link"
import PageBackdrop from "@modules/common/components/page-backdrop"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = async ({
  customer,
  children,
}) => {
  const t = await getTranslations("account.help")
  return (
    <div className="relative flex-1 small:py-12" data-testid="account-page">
      <PageBackdrop />
      <div className="flex-1 content-container relative h-full max-w-5xl mx-auto bg-card border border-border rounded-2xl flex flex-col">
        <div className="grid grid-cols-1  small:grid-cols-[240px_1fr] py-12">
          <div>{customer && <AccountNav customer={customer} />}</div>
          <div className="flex-1">{children}</div>
        </div>
        <div className="flex flex-col small:flex-row items-end justify-between small:border-t border-border py-12 gap-8">
          <div>
            <h3 className="text-xl-semi mb-4">{t("title")}</h3>
            <span className="txt-medium">{t("body")}</span>
          </div>
          <div>
            <UnderlineLink href="/customer-service">
              {t("link")}
            </UnderlineLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
