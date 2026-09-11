"use client"

import { useEffect } from "react"

// Last-resort crash screen: the root layout (and its styles) failed, so this
// renders standalone with inline styles only.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "24px",
          backgroundColor: "#09090b",
          color: "#fafafa",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <span
          style={{
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontSize: "24px",
          }}
        >
          Nanofield
        </span>
        <p
          style={{
            margin: "24px 0 0",
            fontSize: "72px",
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          500
        </p>
        <h1 style={{ margin: "16px 0 0", fontSize: "24px" }}>
          Application crashed
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            maxWidth: "28rem",
            fontSize: "14px",
            color: "#a1a1aa",
          }}
        >
          {error.message ||
            "The storefront failed to start. Please try again, and contact support if the problem persists."}
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "32px",
            padding: "10px 24px",
            borderRadius: "8px",
            border: "1px solid #27272a",
            backgroundColor: "#18181b",
            color: "#fafafa",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
