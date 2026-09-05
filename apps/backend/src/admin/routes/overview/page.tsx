import { useQuery } from "@tanstack/react-query"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { sdk } from "../../lib/sdk"
import { NanofieldAvatar } from "../../components/nanofield-avatar"

// Core wraps every extension icon in a 20px bordered tile with a 15px
// viewport — a full-bleed mark looks intentional there, a thin outline
// glyph looks lost. So the sidebar entry uses the brand blobs tile.
const NanofieldRouteIcon = () => {
  return <NanofieldAvatar className="h-full w-full" />
}

// Nanofield home inside the admin: store status at a glance + shortcuts.
// Appears in the sidebar as "Nanofield".
const OverviewPage = () => {
  const { data: products } = useQuery({
    queryKey: ["nanofield-overview-products"],
    queryFn: () => sdk.admin.product.list({ limit: 1, fields: "id" }),
  })
  const { data: orders } = useQuery({
    queryKey: ["nanofield-overview-orders"],
    queryFn: () => sdk.admin.order.list({ limit: 1, fields: "id" }),
  })
  const { data: stores } = useQuery({
    queryKey: ["nanofield-overview-store"],
    queryFn: () => sdk.admin.store.list({ limit: 1 }),
  })

  const store = stores?.stores?.[0]
  const currencies =
    store?.supported_currencies
      ?.map((c) => c.currency_code?.toUpperCase())
      .filter(Boolean)
      .join(" · ") || "—"

  return (
    <div className="flex flex-col gap-4 p-8">
      <div>
        <Heading level="h1">Nanofield</Heading>
        <Text className="text-ui-fg-subtle">
          {store?.name ?? "Store"} overview — precision parts, repair stock,
          Shopee imports.
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Container>
          <Text size="small" className="text-ui-fg-subtle">
            Products
          </Text>
          <Heading level="h2">{products?.count ?? "—"}</Heading>
          <Link to="/products">
            <Button variant="secondary" size="small" className="mt-3">
              Manage products
            </Button>
          </Link>
        </Container>
        <Container>
          <Text size="small" className="text-ui-fg-subtle">
            Orders
          </Text>
          <Heading level="h2">{orders?.count ?? "—"}</Heading>
          <Link to="/orders">
            <Button variant="secondary" size="small" className="mt-3">
              View orders
            </Button>
          </Link>
        </Container>
        <Container>
          <Text size="small" className="text-ui-fg-subtle">
            Currencies
          </Text>
          <Heading level="h2">{currencies}</Heading>
          <Text size="small" className="mt-3 text-ui-fg-subtle">
            Shopee imports price in IDR.
          </Text>
        </Container>
      </div>
      <Container>
        <Heading level="h2">E-comm import</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          Bulk upload / bulk edit from marketplace exports, with preview and
          progress — no terminal needed.
        </Text>
        <Link to="/ecomm-import">
          <Button variant="secondary" size="small" className="mt-3">
            Open importer
          </Button>
        </Link>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Nanofield",
  icon: NanofieldRouteIcon,
  // Explicit rank sorts above the unranked core items: Nanofield sits
  // directly under the search bar as the store home.
  rank: 1,
})

export default OverviewPage
