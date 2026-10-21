import { model } from "@medusajs/framework/utils"

// One row per chat session (guest or customer). visitor_token is the
// guest's capability secret (localStorage in the widget); customers are
// also keyed by customer_id so a logged-in member's session survives a
// token wipe. status: open | closed. admin_unread counts visitor messages
// the operator has not seen; visitor_unread counts admin replies the
// visitor's widget has not fetched (widget resets it on load/reconnect).
export const ChatConversation = model
  .define("chat_conversation", {
    id: model.id().primaryKey(),
    customer_id: model.text().nullable(),
    guest_name: model.text().nullable(),
    guest_email: model.text().nullable(),
    visitor_token: model.text().nullable(),
    status: model.text().default("open"),
    admin_unread: model.number().default(0),
    visitor_unread: model.number().default(0),
    last_message_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["visitor_token"], unique: true },
    { on: ["customer_id"] },
    { on: ["status"] },
    { on: ["last_message_at"] },
  ])
