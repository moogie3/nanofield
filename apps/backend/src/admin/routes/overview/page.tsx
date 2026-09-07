import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { sdk } from "../../lib/sdk"
import { NanofieldAvatar } from "../../components/nanofield-avatar"

// Core wraps every extension icon in a 20px bordered tile with a 15px
// viewport — a full-bleed mark looks intentional there, a thin outline
// glyph looks lost. So the sidebar entry uses the brand blobs tile.
const NanofieldRouteIcon = () => {
  return <NanofieldAvatar className="h-full w-full" />
}

type RangeKey = "day" | "month" | "year"

type OrderRow = {
  id: string
  total: number | string
  created_at: string
  currency_code: string
}

type Bucket = { key: string; label: string; orders: number; revenue: number }

const pad = (n: number) => String(n).padStart(2, "0")

const bucketize = (orders: OrderRow[], range: RangeKey) => {
  const now = new Date()
  const buckets: Bucket[] = []
  const index = new Map<string, Bucket>()

  if (range === "day") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const label = new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
      }).format(d)
      const b = { key, label, orders: 0, revenue: 0 }
      buckets.push(b)
      index.set(key, b)
    }
  } else if (range === "month") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      const label = new Intl.DateTimeFormat("en", { month: "short" }).format(d)
      const b = { key, label, orders: 0, revenue: 0 }
      buckets.push(b)
      index.set(key, b)
    }
  } else {
    const startYear = now.getFullYear() - 4
    for (let y = startYear; y <= now.getFullYear(); y++) {
      const b = { key: String(y), label: String(y), orders: 0, revenue: 0 }
      buckets.push(b)
      index.set(b.key, b)
    }
  }

  const keyOf = (d: Date) =>
    range === "day"
      ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      : range === "month"
        ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
        : String(d.getFullYear())

  for (const o of orders) {
    const t = Date.parse(o.created_at)
    if (Number.isNaN(t)) {
      continue
    }
    const b = index.get(keyOf(new Date(t)))
    if (!b) {
      continue
    }
    b.orders += 1
    b.revenue += Number(o.total) || 0
  }

  const currency =
    Object.entries(
      orders.reduce<Record<string, number>>((acc, o) => {
        acc[o.currency_code || ""] = (acc[o.currency_code || ""] || 0) + 1
        return acc
      }, {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0] || "IDR"

  return { buckets, currency }
}

const fetchAllOrders = async (): Promise<OrderRow[]> => {
  const all: OrderRow[] = []
  let offset = 0
  for (;;) {
    const page = (await sdk.admin.order.list({
      limit: 100,
      offset,
      fields: "id,total,created_at,currency_code",
      order: "-created_at",
    })) as unknown as { orders?: OrderRow[] }
    const rows = page.orders || []
    all.push(...rows)
    if (rows.length < 100 || all.length >= 1000) {
      break
    }
    offset += 100
  }
  return all
}

const OrderAnalytics = () => {
  const [range, setRange] = useState<RangeKey>("month")
  const { data: orders, isLoading } = useQuery({
    queryKey: ["nanofield-order-analytics"],
    queryFn: fetchAllOrders,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <Container>
        <Heading level="h2">Order analytics</Heading>
        <Text className="mt-1 text-ui-fg-subtle">Loading orders…</Text>
      </Container>
    )
  }

  const { buckets, currency } = bucketize(orders || [], range)
  const totalRevenue = buckets.reduce((n, b) => n + b.revenue, 0)
  const totalOrders = buckets.reduce((n, b) => n + b.orders, 0)
  const money = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  const compact = (n: number) =>
    new Intl.NumberFormat("en", { notation: "compact" }).format(n)

  const empty = totalOrders === 0

  return (
    <Container>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading level="h2">Order analytics</Heading>
          <Text className="text-ui-fg-subtle">
            Orders and revenue per {range === "day" ? "day" : range}.
          </Text>
        </div>
        <div className="flex gap-2">
          {(["day", "month", "year"] as RangeKey[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? "primary" : "secondary"}
              size="small"
              onClick={() => setRange(r)}
            >
              {r === "day" ? "Daily" : r === "month" ? "Monthly" : "Yearly"}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["Revenue", money(totalRevenue)],
          ["Orders", String(totalOrders)],
          [
            "Avg order",
            totalOrders > 0 ? money(totalRevenue / totalOrders) : money(0),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-ui-border-base p-3"
          >
            <Text size="small" className="text-ui-fg-subtle">
              {label}
            </Text>
            <Heading level="h2">{value}</Heading>
          </div>
        ))}
      </div>

      {empty ? (
        <Text size="small" className="mt-4 text-ui-fg-subtle">
          No orders in this range yet — charts appear after the first sale.
        </Text>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <Text size="small" className="mb-2 font-medium">
              Orders
            </Text>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} margin={{ left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Bar dataKey="orders" fill="#0E7C8C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <Text size="small" className="mb-2 font-medium">
              Revenue ({currency.toUpperCase()})
            </Text>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={buckets} margin={{ left: -4 }}>
                  <defs>
                    <linearGradient
                      id="nf-revenue-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#2C8869"
                        stopOpacity={0.45}
                      />
                      <stop
                        offset="100%"
                        stopColor="#2C8869"
                        stopOpacity={0.04}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={52}
                    tickFormatter={(v: number) => compact(v)}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(label) => `Period: ${label}`}
                    formatter={(value) => [
                      money(Number(value) || 0),
                      "Revenue",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2C8869"
                    strokeWidth={2}
                    fill="url(#nf-revenue-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
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
      <Container>
        <Heading level="h1">Nanofield</Heading>
        <Text className="text-ui-fg-subtle">
          {store?.name ?? "Store"} overview — precision parts, repair stock,
          Shopee imports.
        </Text>
      </Container>
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
      <OrderAnalytics />
      <Container>
        <Heading level="h2">E-comm import</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          Bulk upload / bulk edit from Shopee exports, with preview and
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
