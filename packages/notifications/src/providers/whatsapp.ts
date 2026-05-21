// WhatsApp Provider Interface
// Supports both the legacy whatsapp-web.js bot and the official WhatsApp Cloud API

export interface WhatsAppMessage {
  to: string; // Phone number with country code (e.g. 919876543210)
  body: string;
  templateName?: string;
  templateParams?: string[]; // Ordered positional params for Cloud API templates
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppProvider {
  name: string;
  send(message: WhatsAppMessage): Promise<WhatsAppSendResult>;
  isReady(): Promise<boolean>;
  getQRCode?(): Promise<string | null>;
}

// ─── Console provider (development / fallback) ───────────────────────────────

export class ConsoleWhatsAppProvider implements WhatsAppProvider {
  name = "console";

  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    console.log("[WHATSAPP]", {
      to: message.to,
      body: message.body.substring(0, 100) + (message.body.length > 100 ? "..." : ""),
    });
    return { success: true, messageId: `console-wa-${Date.now()}` };
  }

  async isReady(): Promise<boolean> {
    return true;
  }
}

// ─── WhatsApp Cloud API (official Meta Business API) ─────────────────────────

const GRAPH_API_VERSION = "v18.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class WhatsAppBusinessProvider implements WhatsAppProvider {
  name = "whatsapp-cloud";

  private readonly accessToken: string;
  private readonly phoneNumberId: string;

  constructor(config: { accessToken: string; phoneNumberId: string }) {
    this.accessToken = config.accessToken;
    this.phoneNumberId = config.phoneNumberId;
  }

  async isReady(): Promise<boolean> {
    return !!this.accessToken && !!this.phoneNumberId;
  }

  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    const phone = message.to.replace(/[^0-9]/g, "");
    if (!phone) {
      return { success: false, error: "Invalid phone number" };
    }

    const url = `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`;

    const body = message.templateName
      ? this.buildTemplatePayload(phone, message.templateName, message.templateParams ?? [])
      : this.buildTextPayload(phone, message.body);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json() as any;

      if (!res.ok) {
        const errMsg = data?.error?.message ?? `HTTP ${res.status}`;
        console.error("[WhatsApp Cloud API] Send failed:", data);
        return { success: false, error: errMsg };
      }

      const messageId = data?.messages?.[0]?.id;
      return { success: true, messageId };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errMsg };
    }
  }

  private buildTextPayload(to: string, text: string) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    };
  }

  private buildTemplatePayload(to: string, templateName: string, params: string[]) {
    const components = params.length > 0
      ? [{ type: "body", parameters: params.map((p) => ({ type: "text", text: p })) }]
      : [];

    return {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components,
      },
    };
  }
}
