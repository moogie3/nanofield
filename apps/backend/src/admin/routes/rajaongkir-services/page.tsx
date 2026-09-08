import { useCallback, useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { TruckFast } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Switch,
  Text,
} from "@medusajs/ui"

// Admin-managed RajaOngkir service catalog. Built-ins (jne-reg, jnt-eco)
// always exist and can only be disabled; anything added here appears in the
// fulfillment-option dropdown when creating a shipping option — no deploy,
// no console, works the same in production.
type CatalogRow = {
  code: string
  courier: string
  service_code: string
  label: string
  cheapest_match: boolean
  is_enabled: boolean
  built_in: boolean
}

const RouteIcon = () => {
  return <TruckFast />
}

const emptyForm = { code: "", courier: "", service: "", name: "" }

const ShippingServicesPage = () => {
  const [rows, setRows] = useState<CatalogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch("/admin/rajaongkir-services")
      const data = (await r.json()) as {
        rows?: CatalogRow[]
        message?: string
      }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      setRows(data.rows || [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (payload: Record<string, unknown>) => {
    setSaving(true)
    setError(null)
    try {
      const r = await fetch("/admin/rajaongkir-services", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const addCustom = async () => {
    await save({
      code: form.code,
      courier: form.courier,
      service_code: form.service,
      label: form.name,
      cheapest_match: true,
    })
    setForm(emptyForm)
  }

  const toggle = async (s: CatalogRow) => {
    await save({
      code: s.code,
      courier: s.courier,
      service_code: s.service_code,
      label: s.label,
      cheapest_match: s.cheapest_match,
      is_enabled: !s.is_enabled,
    })
  }

  const remove = async (s: CatalogRow) => {
    setSaving(true)
    setError(null)
    try {
      const r = await fetch(
        `/admin/rajaongkir-services/${encodeURIComponent(s.code)}`,
        { method: "DELETE" }
      )
      const data = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const formValid =
    /^[a-z0-9-]{2,40}$/.test(form.code.trim().toLowerCase()) &&
    form.courier.trim() !== "" &&
    form.service.trim() !== "" &&
    form.name.trim() !== ""

  return (
    <div className="flex flex-col gap-4 p-4">
      <Container>
        <Heading level="h1">Shipping services</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          RajaOngkir courier services (Jambi origin). Disabled entries and
          new customs take effect immediately — the fulfillment-option
          dropdown on shipping options reads this list live.
        </Text>
      </Container>
      {error && (
        <Container>
          <Text className="text-ui-fg-error">{error}</Text>
        </Container>
      )}
      <Container>
        <Heading level="h2">Services</Heading>
        {loading ? (
          <Text className="mt-2 text-ui-fg-subtle">Loading…</Text>
        ) : (
          <div className="mt-2 flex flex-col divide-y divide-ui-border-base">
            {rows.map((s) => (
              <div
                key={s.code}
                className="flex items-center gap-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Text weight="plus">{s.label}</Text>
                    {s.built_in ? (
                      <Badge color="blue">built-in</Badge>
                    ) : (
                      <Badge color="grey">custom</Badge>
                    )}
                    {!s.is_enabled && <Badge color="red">disabled</Badge>}
                  </div>
                  <Text className="text-ui-fg-subtle">
                    {s.code} · {s.courier}:{s.service_code}
                    {s.cheapest_match ? " · cheapest match" : ""}
                  </Text>
                </div>
                <Switch
                  checked={s.is_enabled}
                  onCheckedChange={() => void toggle(s)}
                  disabled={saving}
                />
                {!s.built_in && (
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => void remove(s)}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                )}
              </div>
            ))}
            {rows.length > 0 && rows.every((s) => !s.is_enabled) && (
              <Text className="py-2 text-ui-fg-subtle">
                Everything is disabled — checkout will use the flat fallback
                rate for every option.
              </Text>
            )}
          </div>
        )}
      </Container>
      <Container>
        <Heading level="h2">Add custom service</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          Example: SiCepat REG — code <code>sicepat-reg</code>, courier{" "}
          <code>sicepat</code>, service <code>REG</code>. New services quote
          the courier&apos;s cheapest returned rate. Find exact service codes
          with a test quote in the RajaOngkir dashboard.
        </Text>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rrs-code">Code (a-z, 0-9, dash)</Label>
            <Input
              id="rrs-code"
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toLowerCase() })
              }
              placeholder="sicepat-reg"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rrs-label">Display name</Label>
            <Input
              id="rrs-label"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="SiCepat REG (2-3 hari)"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rrs-courier">Courier code</Label>
            <Input
              id="rrs-courier"
              value={form.courier}
              onChange={(e) =>
                setForm({ ...form, courier: e.target.value.toLowerCase() })
              }
              placeholder="sicepat"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rrs-service">Service code</Label>
            <Input
              id="rrs-service"
              value={form.service}
              onChange={(e) =>
                setForm({ ...form, service: e.target.value.toUpperCase() })
              }
              placeholder="REG"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button
            onClick={() => void addCustom()}
            disabled={!formValid || saving}
          >
            Add service
          </Button>
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Shipping Services",
  icon: RouteIcon,
})

export default ShippingServicesPage
