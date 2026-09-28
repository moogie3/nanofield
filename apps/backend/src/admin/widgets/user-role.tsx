import { useEffect, useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import type { HttpTypes } from "@medusajs/types"

// Shown on the user detail page (user.details.before). Lets the Owner
// view and change the RBAC role for any admin user. Staff without the
// Owner role see nothing (the API returns 403, the widget stays hidden).

type RbacRole = {
  id: string
  name: string
  description?: string
}

type UserRoleWidgetProps = {
  data: HttpTypes.AdminUser
}

const roleBadgeColor = (name: string): "blue" | "green" | "grey" | "orange" | "red" | "purple" => {
  if (name === "Owner") return "blue"
  if (name === "Staff") return "grey"
  return "grey"
}

const UserRoleWidget = ({ data }: UserRoleWidgetProps) => {
  const userId = data.id

  const [currentRole, setCurrentRole] = useState<RbacRole | null>(null)
  const [allRoles, setAllRoles] = useState<RbacRole[]>([])
  const [selected, setSelected] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    if (!userId) {
      return
    }
    setLoading(true)
    fetch(`/admin/user-roles?user_id=${encodeURIComponent(userId)}`)
      .then(async (r) => {
        if (r.status === 403 || r.status === 401) {
          setForbidden(true)
          return
        }
        const body = (await r.json()) as {
          user_role: RbacRole | null
          roles: RbacRole[]
        }
        setCurrentRole(body.user_role)
        setAllRoles(body.roles)
        setSelected(body.user_role?.id ?? "")
      })
      .catch(() => {
        setForbidden(true)
      })
      .finally(() => setLoading(false))
  }, [userId])

  if (forbidden || (!loading && allRoles.length === 0)) {
    return null
  }

  const isDirty = selected !== (currentRole?.id ?? "")

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch("/admin/user-roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: userId, role_id: selected || null }),
      })
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { message?: string }
        throw new Error(body.message || r.statusText)
      }
      const newRole = allRoles.find((role) => role.id === selected) ?? null
      setCurrentRole(newRole)
      toast.success("Role updated", {
        description: newRole
          ? `${data.email} is now ${newRole.name}`
          : `Role cleared for ${data.email}`,
      })
    } catch (e) {
      toast.error("Failed to update role", {
        description: (e as Error).message,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y divide-dashed divide-ui-border-base p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Role</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Controls what this user can access in the admin dashboard.
        </Text>
      </div>
      <div className="flex flex-col gap-4 px-6 py-4">
        {loading ? (
          <Text size="small" className="text-ui-fg-subtle">
            Loading…
          </Text>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Text size="small" className="font-medium">
                Current role:
              </Text>
              {currentRole ? (
                <Badge color={roleBadgeColor(currentRole.name)}>
                  {currentRole.name}
                </Badge>
              ) : (
                <Badge color="orange">No role</Badge>
              )}
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select
                  value={selected}
                  onValueChange={(v) => setSelected(v === "__none__" ? "" : v)}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select a role" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="__none__">
                      No role
                    </Select.Item>
                    {allRoles.map((role) => (
                      <Select.Item key={role.id} value={role.id}>
                        {role.name}
                        {role.description ? ` — ${role.description}` : ""}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <Button
                variant="primary"
                size="small"
                disabled={!isDirty || saving}
                isLoading={saving}
                onClick={() => void save()}
              >
                Save
              </Button>
            </div>
            <Text size="xsmall" className="text-ui-fg-muted">
              The new role takes effect on next login for this user.
            </Text>
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  id: "nanofield:user-role",
  zone: "user.details.before",
})

export default UserRoleWidget
