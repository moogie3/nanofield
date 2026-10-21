import { model } from "@medusajs/framework/utils"

// One row per message. sender_type: visitor | admin | system (system is
// reserved for scripted notices, e.g. "we are offline"). sender_label is a
// display snapshot (guest name / admin user name / "You") so the thread
// renders without joining users. image_url is an optional attachment
// (relative /static/chat/ path minted by the upload route) — a message may
// be image-only (empty body). No soft relations — conversation_id is a
// plain FK string, matching the content module's flat-model style.
export const ChatMessage = model
  .define("chat_message", {
    id: model.id().primaryKey(),
    conversation_id: model.text(),
    sender_type: model.text(),
    sender_label: model.text().nullable(),
    body: model.text(),
    image_url: model.text().nullable(),
  })
  .indexes([
    { on: ["conversation_id"] },
    { on: ["created_at"] },
  ])
