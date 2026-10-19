import type { ReactElement } from "react"
import { ArrowDownMini, ArrowUpMini, PlusMini, Trash } from "@medusajs/icons"
import {
  Button,
  Heading,
  IconButton,
  Input,
  Label,
  Text,
  Textarea,
} from "@medusajs/ui"
import {
  isSimpleList,
  type RegistryListField,
  type RegistryPage,
  type RegistryScalarField,
} from "../../../modules/content/registry"

// Dynamic editor for a registry page (src/modules/content/registry.ts): the
// page's sections/fields describe the form, so adding a field to the registry
// adds its input here with no UI change. Values live in the page's `data`
// JSON column at the field keys; empty inputs are pruned server-side, which
// is what makes the storefront fall back to its built-in copy.

type Path = (string | number)[]

type Host = {
  root: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

const getIn = (root: unknown, path: Path): unknown =>
  path.reduce<unknown>((acc, seg) => {
    if (acc === null || acc === undefined) {
      return undefined
    }
    if (typeof seg === "number") {
      return Array.isArray(acc) ? acc[seg] : undefined
    }
    return typeof acc === "object"
      ? (acc as Record<string, unknown>)[seg]
      : undefined
  }, root)

const setIn = (root: unknown, path: Path, value: unknown): unknown => {
  if (path.length === 0) {
    return value
  }
  const [head, ...rest] = path
  if (typeof head === "number") {
    const arr = Array.isArray(root) ? [...root] : []
    arr[head] = setIn(arr[head], rest, value)
    return arr
  }
  const obj: Record<string, unknown> =
    root && typeof root === "object" && !Array.isArray(root)
      ? { ...(root as Record<string, unknown>) }
      : {}
  obj[head] = setIn(obj[head], rest, value)
  return obj
}

const blankItem = (field: RegistryListField): unknown => {
  if (isSimpleList(field)) {
    return ""
  }
  const item: Record<string, unknown> = {}
  for (const itemField of field.itemFields) {
    item[itemField.key] = itemField.kind === "list" ? [] : ""
  }
  return item
}

// "Bullet points" -> "bullet point": singular caption for an item card.
const itemCaption = (label: string): string =>
  label.replace(/s$/, "").toLowerCase()

type ScalarFieldProps = Host & {
  field: RegistryScalarField
  path: Path
  label?: string
  showLabel?: boolean
}

const ScalarField = ({
  field,
  path,
  root,
  onChange,
  label,
  showLabel = true,
}: ScalarFieldProps): ReactElement => {
  const id = `data-${path.join("-")}`
  const text = label ?? field.label
  const stored = getIn(root, path)
  const value = typeof stored === "string" ? stored : ""
  const update = (next: string) =>
    onChange(setIn(root, path, next) as Record<string, unknown>)
  const control =
    field.kind === "paragraph" ? (
      <Textarea
        id={id}
        rows={3}
        value={value}
        maxLength={field.maxLength}
        aria-label={showLabel ? undefined : text}
        onChange={(e) => update(e.target.value)}
      />
    ) : (
      <Input
        id={id}
        value={value}
        maxLength={field.maxLength}
        aria-label={showLabel ? undefined : text}
        onChange={(e) => update(e.target.value)}
      />
    )
  if (!showLabel) {
    return control
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{text}</Label>
      {control}
    </div>
  )
}

type ListFieldProps = Host & {
  field: RegistryListField
  path: Path
}

const ListField = ({
  field,
  path,
  root,
  onChange,
}: ListFieldProps): ReactElement => {
  const stored = getIn(root, path)
  const items: unknown[] = Array.isArray(stored) ? stored : []
  const patch = (next: unknown[]) =>
    onChange(setIn(root, path, next) as Record<string, unknown>)
  const add = () => patch([...items, blankItem(field)])
  const remove = (index: number) =>
    patch(items.filter((_, i) => i !== index))
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= items.length) {
      return
    }
    const next = [...items]
    const from = next[index]
    next[index] = next[target]
    next[target] = from
    patch(next)
  }
  const simple = isSimpleList(field)
  const firstItemField = field.itemFields[0]
  const caption = itemCaption(field.label)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Text weight="plus" size="small">
          {field.label}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          {items.length} of {field.maxItems}
        </Text>
      </div>

      {items.map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-ui-border-base p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <Text size="small" weight="plus" className="text-ui-fg-subtle">
              {caption} {index + 1}
            </Text>
            <div className="flex items-center gap-1">
              <IconButton
                variant="transparent"
                size="small"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUpMini />
              </IconButton>
              <IconButton
                variant="transparent"
                size="small"
                aria-label="Move down"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDownMini />
              </IconButton>
              <IconButton
                variant="transparent"
                size="small"
                aria-label="Remove"
                onClick={() => remove(index)}
              >
                <Trash />
              </IconButton>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {simple ? (
              firstItemField.kind !== "list" && (
                <ScalarField
                  field={firstItemField}
                  path={[...path, index]}
                  root={root}
                  onChange={onChange}
                  showLabel={false}
                />
              )
            ) : (
              field.itemFields.map((itemField) =>
                itemField.kind === "list" ? (
                  <ListField
                    key={itemField.key}
                    field={itemField}
                    path={[...path, index, itemField.key]}
                    root={root}
                    onChange={onChange}
                  />
                ) : (
                  <ScalarField
                    key={itemField.key}
                    field={itemField}
                    path={[...path, index, itemField.key]}
                    root={root}
                    onChange={onChange}
                  />
                )
              )
            )}
          </div>
        </div>
      ))}

      <Button
        variant="secondary"
        size="small"
        className="w-fit"
        disabled={items.length >= field.maxItems}
        onClick={add}
      >
        <PlusMini className="mr-1" />
        Add {caption}
      </Button>
    </div>
  )
}

type RegistryFormProps = {
  page: RegistryPage
  data: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

export const RegistryForm = ({
  page,
  data,
  onChange,
}: RegistryFormProps): ReactElement => (
  <div className="mt-4 flex flex-col gap-4">
    {page.sections.map((section) => (
      <div
        key={section.label}
        className="rounded-lg border border-ui-border-base p-4"
      >
        <Heading level="h3">{section.label}</Heading>
        <div className="mt-3 flex flex-col gap-4">
          {section.fields.map((field) =>
            field.kind === "list" ? (
              <ListField
                key={field.key}
                field={field}
                path={[field.key]}
                root={data}
                onChange={onChange}
              />
            ) : (
              <ScalarField
                key={field.key}
                field={field}
                path={[field.key]}
                root={data}
                onChange={onChange}
              />
            )
          )}
        </div>
      </div>
    ))}
    <Text className="text-ui-fg-subtle">
      Leave a field empty to use the storefront&apos;s built-in copy for the
      current language.
    </Text>
  </div>
)
