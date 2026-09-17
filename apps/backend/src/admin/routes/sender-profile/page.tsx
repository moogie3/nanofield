import { useCallback, useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"

// Store sender block printed as Pengirim on every shipping label. Edits land
// on the next printed label immediately — no deploy, no env change. Until a
// profile is saved, labels fall back to the STORE_* env values.
type Sender = {
  name: string
  phone: string
  address_1: string
  city: string
  province: string
  country_code: string
}

const RouteIcon = () => {
  return <BuildingStorefront />
}

const emptyForm: Sender = {
  name: "",
  phone: "",
  address_1: "",
  city: "",
  province: "",
  country_code: "",
}

const SenderProfilePage = () => {
  const [form, setForm] = useState<Sender>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch("/admin/sender-profile")
      const data = (await r.json()) as {
        sender?: Sender
        message?: string
      }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      if (data.sender) {
        setForm({
          name: data.sender.name || "",
          phone: data.sender.phone || "",
          address_1: data.sender.address_1 || "",
          city: data.sender.city || "",
          province: data.sender.province || "",
          country_code: data.sender.country_code || "",
        })
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const formValid =
    form.name.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.address_1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    !saving

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const r = await fetch("/admin/sender-profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          address_1: form.address_1.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          country_code: form.country_code.trim() || "id",
        }),
      })
      const data = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      await load()
      toast.success("Sender profile saved", {
        description: "Next printed labels use the new Pengirim block.",
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof Sender) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value })

  return (
    <div className="flex flex-col gap-y-4">
      <Container>
        <Heading level="h1">Store Sender</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          Pengirim block on every shipping label. Shows the saved profile, or
          the STORE_* env values until you save once.
        </Text>
        {error && <Text className="mt-2 text-ui-fg-error">{error}</Text>}
        {loading ? (
          <Text className="mt-2 text-ui-fg-subtle">Loading…</Text>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sender-name">Store name (required)</Label>
                <Input
                  id="sender-name"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Nanofield"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sender-phone">Phone (required)</Label>
                <Input
                  id="sender-phone"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+62 851-2155-0532"
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label htmlFor="sender-address">Street address (required)</Label>
                <Input
                  id="sender-address"
                  value={form.address_1}
                  onChange={set("address_1")}
                  placeholder="Pasar Jambi"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sender-city">City (required)</Label>
                <Input
                  id="sender-city"
                  value={form.city}
                  onChange={set("city")}
                  placeholder="Jambi"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sender-province">Province</Label>
                <Input
                  id="sender-province"
                  value={form.province}
                  onChange={set("province")}
                  placeholder="Jambi"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sender-country">Country code</Label>
                <Input
                  id="sender-country"
                  value={form.country_code}
                  onChange={set("country_code")}
                  placeholder="id"
                />
              </div>
            </div>
            <div className="mt-3">
              <Button onClick={() => void save()} disabled={!formValid}>
                Save sender
              </Button>
            </div>
          </>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Store Sender",
  icon: RouteIcon,
})

export default SenderProfilePage
