import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { sdk } from "../lib/sdk"

const readMeta = (metadata: unknown, key: string): string => {
  if (typeof metadata !== "object" || metadata === null) {
    return ""
  }
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === "string" ? value : ""
}

// Writes the exact metadata keys the storefront datasheet rule reads
// (see storefront `lib/util/product-datasheet.ts`):
// - `no_datasheet: "true"` hides all datasheet UI (tools, consumables)
// - `datasheet_url` always links the real document, any category
// - `mpn` falls back to a datasheet search for that part number
const ProductDatasheetWidget = () => {
  const { id } = useParams()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["nanofield-product-docs", id],
    queryFn: () =>
      sdk.admin.product.retrieve(id!, { fields: "id,title,metadata" }),
    enabled: !!id,
  })

  const metadata = data?.product?.metadata
  const [hasDocs, setHasDocs] = useState(true)
  const [datasheetUrl, setDatasheetUrl] = useState("")
  const [mpn, setMpn] = useState("")

  useEffect(() => {
    if (!data?.product) {
      return
    }
    setHasDocs(readMeta(metadata, "no_datasheet") !== "true")
    setDatasheetUrl(readMeta(metadata, "datasheet_url"))
    setMpn(readMeta(metadata, "mpn"))
  }, [data, metadata])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () =>
      sdk.admin.product.update(id!, {
        metadata: {
          ...((metadata as Record<string, unknown> | undefined) ?? {}),
          no_datasheet: hasDocs ? "false" : "true",
          datasheet_url: datasheetUrl.trim(),
          mpn: mpn.trim(),
        },
      }),
    onSuccess: async () => {
      toast.success("Documentation settings saved")
      await queryClient.invalidateQueries({
        queryKey: ["nanofield-product-docs", id],
      })
    },
    onError: () => {
      toast.error("Could not save documentation settings")
    },
  })

  const preview = !hasDocs
    ? "Storefront shows: no datasheet UI"
    : datasheetUrl.trim()
      ? `Storefront shows: View datasheet → ${datasheetUrl.trim()}`
      : mpn.trim()
        ? `Storefront shows: datasheet search for ${mpn.trim()}`
        : "Storefront shows: no datasheet UI (no URL or part number)"

  return (
    <Container className="divide-y divide-dashed divide-ui-border-base p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Datasheet &amp; Docs</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Controls the storefront datasheet button for this product.
        </Text>
      </div>
      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="nanofield-has-docs">Has datasheet / documents</Label>
          <Switch
            id="nanofield-has-docs"
            checked={hasDocs}
            onCheckedChange={setHasDocs}
            disabled={isLoading || isPending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nanofield-datasheet-url">
            Datasheet URL (PDF, optional)
          </Label>
          <Input
            id="nanofield-datasheet-url"
            placeholder="https://…"
            value={datasheetUrl}
            onChange={(e) => setDatasheetUrl(e.target.value)}
            disabled={isLoading || isPending || !hasDocs}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nanofield-mpn">
            Manufacturer part number (MPN, optional)
          </Label>
          <Input
            id="nanofield-mpn"
            placeholder="e.g. IRF540N"
            value={mpn}
            onChange={(e) => setMpn(e.target.value)}
            disabled={isLoading || isPending || !hasDocs}
          />
        </div>
        <Text size="small" className="text-ui-fg-subtle">
          {preview}
        </Text>
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="small"
            isLoading={isPending}
            disabled={isLoading || isPending || !id}
            onClick={() => mutateAsync()}
          >
            Save
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  id: "nanofield:product-datasheet",
  zone: "product.details.side",
})

export default ProductDatasheetWidget
