"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

// Server actions for the live-chat API. Every call the widget makes to the
// backend goes through here EXCEPT the SSE stream (a server action cannot
// stream, so the widget opens it directly with the publishable key header).
// Passing the capability token as a header keeps it out of URLs/logs; the
// customer session (when present) rides along via getAuthHeaders so a
// logged-in member's conversation resumes even after a localStorage wipe.

export type ChatMessage = {
  id: string
  sender_type: string
  sender_label: string | null
  body: string
  image_url: string | null
  created_at: string | null
}

export type ChatConversationView = {
  id: string
  status: string
  last_message_at: string | null
  visitor_unread: number
}

export type ChatSnapshot = {
  ok: boolean
  conversation: ChatConversationView | null
  token: string | null
  messages: ChatMessage[]
  error?: string
}

// Start or resume the conversation. token comes from localStorage; name and
// email are only meaningful for guests (customers attach server-side).
// Never throws — the widget degrades to a visible error line.
export const startChat = async (opts: {
  token?: string | null
  name?: string | null
  email?: string | null
}): Promise<ChatSnapshot> => {
  const authHeaders = await getAuthHeaders()
  try {
    const data = await sdk.client.fetch<{
      conversation: ChatConversationView
      token: string
      messages: ChatMessage[]
    }>(`/store/chat/conversations`, {
      method: "POST",
      headers: {
        ...authHeaders,
        ...(opts.token ? { "x-chat-token": opts.token } : {}),
      },
      body: {
        name: opts.name ?? null,
        email: opts.email ?? null,
      },
      cache: "no-store",
    })
    return {
      ok: true,
      conversation: data.conversation,
      token: data.token,
      messages: data.messages,
    }
  } catch (e) {
    return {
      ok: false,
      conversation: null,
      token: null,
      messages: [],
      error: (e as Error).message,
    }
  }
}

// Backfill since the client's cursor (or the full tail when omitted).
export const fetchChatMessages = async (opts: {
  token: string
  cursor?: string | null
}): Promise<{ ok: boolean; messages: ChatMessage[]; next_cursor: string | null }> => {
  try {
    const data = await sdk.client.fetch<{
      messages: ChatMessage[]
      next_cursor: string | null
    }>(`/store/chat/conversations/current/messages`, {
      method: "GET",
      headers: { "x-chat-token": opts.token },
      query: opts.cursor ? { cursor: opts.cursor } : {},
      cache: "no-store",
    })
    return { ok: true, messages: data.messages, next_cursor: data.next_cursor }
  } catch {
    return { ok: false, messages: [], next_cursor: null }
  }
}

// Visitor sends a message. body may be empty when image_url is set (an
// attachment-only message). ok:false with a message the widget can show;
// rate limits (429) and closed conversations surface as errors here.
export const sendChatMessage = async (opts: {
  token: string
  body: string
  image_url?: string | null
}): Promise<{ ok: boolean; message: ChatMessage | null; error?: string }> => {
  try {
    const data = await sdk.client.fetch<{
      message: ChatMessage
    }>(`/store/chat/conversations/current/messages`, {
      method: "POST",
      headers: { "x-chat-token": opts.token },
      body: {
        body: opts.body,
        ...(opts.image_url ? { image_url: opts.image_url } : {}),
      },
      cache: "no-store",
    })
    return { ok: true, message: data.message }
  } catch (e) {
    return { ok: false, message: null, error: (e as Error).message }
  }
}

// Presence probe — drives the away/WhatsApp affordance. Distinguishes
// three states: true = operator at the inbox, false = reachable but nobody
// home, null = backend unreachable (widget hides the dot rather than
// pretending the team is merely away).
export const getChatStatus = async (): Promise<{
  online: boolean | null
}> => {
  try {
    return await sdk.client.fetch<{ online: boolean }>(`/store/chat/status`, {
      method: "GET",
      cache: "no-store",
    })
  } catch {
    return { online: null }
  }
}
