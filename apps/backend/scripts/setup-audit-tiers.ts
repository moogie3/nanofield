// Audit-log tier setup: Owner (sees everything, reads the audit log) and
// Staff (everything except the audit log) roles plus the audit-log:read
// policy. Idempotent — safe to re-run. Assigns Owner to the admin running
// it; assign Staff to every invited user afterwards (Users → … → Roles).
//
// Why Staff must hold a role: hasPermission fail-opens for users with NO
// roles, so a role-less invitee would pass the audit gate. A Staff member
// holding the (policy-less) Staff role is correctly denied.
//
//   ADMIN_EMAIL=you@nanofield.com ADMIN_PASSWORD=... npx ts-node \
//     --transpileOnly --compilerOptions '{"module":"commonjs"}' \
//     scripts/setup-audit-tiers.ts

const BASE = process.env.BACKEND_URL || "http://localhost:9000"

const fail = (msg: string): never => {
  console.error(`setup-audit-tiers: ${msg}`)
  process.exit(1)
}

const apiFetch = async (
  method: string,
  path: string,
  token: string,
  body?: unknown
): Promise<any> => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    fail(`${method} ${path} -> ${res.status} ${await res.text()}`)
  }
  if (res.status === 204) {
    return null
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

const main = async () => {
  const loginRes = await fetch(`${BASE}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || "admin@test.com",
      password: process.env.ADMIN_PASSWORD || "",
    }),
  })
  if (!loginRes.ok) {
    fail(`login failed: ${loginRes.status} (set ADMIN_EMAIL/ADMIN_PASSWORD)`)
  }
  const { token } = (await loginRes.json()) as { token: string }
  const me = (await apiFetch("GET", "/admin/users/me", token)) as {
    user: { id: string; email: string }
  }
  console.log(`acting as ${me.user.email} (${me.user.id})`)

  const get = (path: string) => apiFetch("GET", path, token)
  const post = (path: string, body: unknown) =>
    apiFetch("POST", path, token, body)

  const ensurePolicy = async (
    key: string,
    resource: string,
    operation: string,
    description: string
  ): Promise<string> => {
    const existing = (await get(
      `/admin/rbac/policies?key=${encodeURIComponent(key)}&limit=1`
    )) as { rbac_policies: { id: string }[] }
    if (existing.rbac_policies?.[0]) {
      console.log(`policy ${key}: exists`)
      return existing.rbac_policies[0].id
    }
    const created = (await post("/admin/rbac/policies", {
      key,
      resource,
      operation,
      name: key,
      description,
    })) as { rbac_policy: { id: string } }
    console.log(`policy ${key}: created`)
    return created.rbac_policy.id
  }

  const ensureRole = async (
    name: string,
    description: string,
    policyIds: string[]
  ): Promise<string> => {
    const existing = (await get(
      `/admin/rbac/roles?name=${encodeURIComponent(name)}&limit=1`
    )) as { rbac_roles: { id: string }[] }
    if (existing.rbac_roles?.[0]) {
      console.log(`role ${name}: exists`)
      return existing.rbac_roles[0].id
    }
    const created = (await post("/admin/rbac/roles", {
      name,
      description,
      policy_ids: policyIds,
    })) as { rbac_role: { id: string } }
    console.log(`role ${name}: created`)
    return created.rbac_role.id
  }

  const auditPolicyId = await ensurePolicy(
    "audit-log-read",
    "audit-log",
    "read",
    "Read the admin audit log (/app/audit-log)."
  )
  const ownerPolicyId = await ensurePolicy(
    "owner-all",
    "*",
    "*",
    "Unrestricted owner access."
  )
  const ownerRoleId = await ensureRole(
    "Owner",
    "Full access including the audit log. First/inviting admin.",
    [auditPolicyId, ownerPolicyId]
  )
  const staffRoleId = await ensureRole(
    "Staff",
    "Day-to-day admin without audit-log access. Assign to every invite.",
    []
  )

  await post(`/admin/rbac/roles/${ownerRoleId}/users`, {
    users: [me.user.id],
  })
  console.log(`assigned Owner to ${me.user.email}`)

  console.log(
    `done. Staff role id: ${staffRoleId} — assign it to every invited user.`
  )
}

main().catch((e) => fail(String(e?.message || e)))
