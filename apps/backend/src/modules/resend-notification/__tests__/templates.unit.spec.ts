import { TEMPLATES } from "../templates"
import ResendService from "../service"
import MailtrapService from "../../mailtrap-notification/service"

describe("customer email templates", () => {
  it("confirmation names the order and total", () => {
    const rendered = TEMPLATES["nanofield-order-confirmation"]({
      displayId: 5,
      totalFormatted: "Rp 190.000",
      trackingUrl: "https://nanofield.com/order/abc",
    })
    expect(rendered.subject).toContain("#5")
    expect(rendered.html).toContain("Rp 190.000")
    expect(rendered.html).toContain("https://nanofield.com/order/abc")
    expect(rendered.text).toContain("#5")
  })

  it("shipped leads with the AWB when present", () => {
    const rendered = TEMPLATES["nanofield-order-shipped"]({
      displayId: 5,
      courier: "JNE",
      awb: "123456789012",
    })
    expect(rendered.subject).toContain("#5")
    expect(rendered.html).toContain("123456789012")
    expect(rendered.text).toContain("123456789012")
  })

  it("shipped degrades gracefully without an AWB", () => {
    const rendered = TEMPLATES["nanofield-order-shipped"]({ displayId: 5 })
    expect(rendered.html).toContain("AWB is being booked")
    expect(rendered.text).toContain("AWB is being booked")
  })

  it("delivered and canceled carry the order reference", () => {
    expect(
      TEMPLATES["nanofield-order-delivered"]({ displayId: 7 }).subject
    ).toContain("#7")
    const canceled = TEMPLATES["nanofield-order-canceled"]({ displayId: 8 })
    expect(canceled.subject).toContain("#8")
    expect(canceled.text).toContain("refund")
  })

  it("return templates carry the order reference", () => {
    const requested = TEMPLATES["nanofield-return-requested"]({ displayId: 9 })
    expect(requested.subject).toContain("#9")
    expect(requested.text).toContain("under review")
    const received = TEMPLATES["nanofield-return-received"]({ displayId: 10 })
    expect(received.subject).toContain("#10")
    expect(received.text).toContain("refund")
    const exchange = TEMPLATES["nanofield-return-update"]({
      displayId: 11,
      kind: "exchange",
    })
    expect(exchange.subject).toContain("Exchange update")
    expect(exchange.subject).toContain("#11")
    const claim = TEMPLATES["nanofield-return-update"]({ displayId: 12 })
    expect(claim.subject).toContain("Claim update")
  })

  it("escapes user-controlled content in html", () => {
    const rendered = TEMPLATES["nanofield-order-confirmation"]({
      displayId: '<img src=x onerror=alert(1)>',
    })
    expect(rendered.html).not.toContain("<img src=x onerror=alert(1)>")
    expect(rendered.html).toContain("&lt;img")
  })

  it("footer degrades when contact is absent", () => {
    const rendered = TEMPLATES["nanofield-order-confirmation"]({
      displayId: 1,
    })
    expect(rendered.html).toContain("Nanofield")
    expect(rendered.html).not.toContain("undefined")
  })
})

describe("email provider wiring", () => {
  it("resend and mailtrap share identifiers, channels diverge", () => {
    expect(ResendService.identifier).toBe("resend")
    expect(MailtrapService.identifier).toBe("mailtrap")
  })

  it("resend rejects missing credentials at boot", () => {
    expect(() => ResendService.validateOptions({})).toThrow(/apiKey/)
    expect(() => ResendService.validateOptions({ apiKey: "x" })).toThrow(
      /from/
    )
    expect(() =>
      ResendService.validateOptions({ apiKey: "x", from: "y@z.com" })
    ).not.toThrow()
  })

  it("mailtrap requires SMTP credentials at boot", () => {
    expect(() => MailtrapService.validateOptions({})).toThrow(/host/)
    expect(() =>
      MailtrapService.validateOptions({ host: "h", user: "u" })
    ).toThrow(/pass/)
    expect(() =>
      MailtrapService.validateOptions({ host: "h", user: "u", pass: "p" })
    ).not.toThrow()
  })
})
