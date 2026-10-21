import {
  extractToken,
  serializeConversationAdmin,
  serializeConversationStore,
  serializeMessage,
} from "../route-helpers"
import type {
  ChatConversationRow,
  ChatMessageRow,
} from "../route-helpers"

const conversation: ChatConversationRow = {
  id: "chat_01",
  customer_id: "cus_01",
  guest_name: "Ayu",
  guest_email: "ayu@example.com",
  visitor_token: "a".repeat(48),
  status: "open",
  admin_unread: 2,
  visitor_unread: 1,
  last_message_at: "2026-10-21T00:00:00.000Z",
  created_at: "2026-10-20T00:00:00.000Z",
}

describe("serializeConversationStore", () => {
  it("hides identity fields and admin counters", () => {
    const out = serializeConversationStore(conversation)
    expect(out).toEqual({
      id: "chat_01",
      status: "open",
      last_message_at: "2026-10-21T00:00:00.000Z",
      visitor_unread: 1,
    })
    expect(out).not.toHaveProperty("customer_id")
    expect(out).not.toHaveProperty("guest_email")
    expect(out).not.toHaveProperty("admin_unread")
    expect(out).not.toHaveProperty("visitor_token")
  })
})

describe("serializeConversationAdmin", () => {
  it("includes identity and admin counters but not the token", () => {
    const out = serializeConversationAdmin(conversation)
    expect(out.customer_id).toBe("cus_01")
    expect(out.guest_name).toBe("Ayu")
    expect(out.admin_unread).toBe(2)
    expect(out).not.toHaveProperty("visitor_token")
  })

  it("converts Date fields to ISO strings", () => {
    const out = serializeConversationAdmin({
      ...conversation,
      created_at: new Date("2026-10-20T00:00:00.000Z"),
      last_message_at: null,
    })
    expect(out.created_at).toBe("2026-10-20T00:00:00.000Z")
    expect(out.last_message_at).toBeNull()
  })
})

describe("serializeMessage", () => {
  const message: ChatMessageRow = {
    id: "msg_01",
    conversation_id: "chat_01",
    sender_type: "visitor",
    sender_label: "Ayu",
    body: "halo",
    created_at: "2026-10-21T00:00:00.000Z",
  }

  it("serializes the message fields", () => {
    expect(serializeMessage(message)).toEqual({
      id: "msg_01",
      sender_type: "visitor",
      sender_label: "Ayu",
      body: "halo",
      image_url: null,
      created_at: "2026-10-21T00:00:00.000Z",
    })
  })

  it("passes the image attachment through", () => {
    expect(
      serializeMessage({ ...message, image_url: "/static/chat/x.png" })
        .image_url
    ).toBe("/static/chat/x.png")
  })
})

describe("extractToken", () => {
  it("prefers the header over the query", () => {
    const req = {
      headers: { "x-chat-token": "header-token" },
      query: { token: "query-token" },
    }
    expect(extractToken(req)).toBe("header-token")
  })

  it("falls back to the query string", () => {
    expect(extractToken({ headers: {}, query: { token: "query-token" } })).toBe(
      "query-token"
    )
  })

  it("returns null when neither is present", () => {
    expect(extractToken({ headers: {}, query: {} })).toBeNull()
  })
})
