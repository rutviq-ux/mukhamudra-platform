// Email Provider Interface
// Allows swapping between Listmonk, SendGrid, SES, etc.

export interface EmailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  name: string;
  
  /**
   * Send a single email
   */
  send(message: EmailMessage): Promise<EmailSendResult>;
  
  /**
   * Send a transactional email using a template
   */
  sendTemplate(
    to: string,
    templateId: string,
    data: Record<string, unknown>
  ): Promise<EmailSendResult>;
  
  /**
   * Check if this provider is healthy/available
   */
  healthCheck(): Promise<boolean>;
}

// Listmonk implementation
export class ListmonkEmailProvider implements EmailProvider {
  name = "listmonk";
  
  private url: string;
  private authHeader: string;

  constructor(config: { url: string; username: string; password: string }) {
    this.url = config.url.replace(/\/$/, "");
    this.authHeader = `Basic ${Buffer.from(
      `${config.username}:${config.password}`
    ).toString("base64")}`;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    // Listmonk requires a template for transactional emails
    // For direct send, we'd need to create an ad-hoc campaign
    // This is a simplified implementation
    try {
      const response = await fetch(`${this.url}/api/tx`, {
        method: "POST",
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriber_email: message.to,
          template_id: message.templateId ? parseInt(message.templateId) : 1,
          data: message.templateData || {},
          content_type: "html",
          from_email: message.from,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendTemplate(
    to: string,
    templateId: string,
    data: Record<string, unknown>
  ): Promise<EmailSendResult> {
    return this.send({
      to,
      subject: "", // Template has subject
      templateId,
      templateData: data,
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.url}/api/health`, {
        headers: { Authorization: this.authHeader },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Resend implementation (hosted transactional email)
// Uses Resend's REST API directly — no SDK dependency required.
export class ResendEmailProvider implements EmailProvider {
  name = "resend";

  private apiKey: string;
  private defaultFrom: string;

  constructor(config: { apiKey: string; defaultFrom: string }) {
    this.apiKey = config.apiKey;
    this.defaultFrom = config.defaultFrom;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const html = message.html ?? (message.text ? undefined : "");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: message.from || this.defaultFrom,
          to: message.to,
          subject: message.subject,
          ...(html !== undefined ? { html } : {}),
          ...(message.text ? { text: message.text } : {}),
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Resend ${response.status}: ${error}` };
      }

      const data = (await response.json()) as { id?: string };
      return { success: true, messageId: data.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendTemplate(
    to: string,
    _templateId: string,
    _data: Record<string, unknown>
  ): Promise<EmailSendResult> {
    // Templates in this system are rendered before send (subject/body are
    // already filled in queueNotification), so there's no provider-side
    // template to resolve. This path is unused for Resend.
    return {
      success: false,
      error: "sendTemplate not supported for Resend; send pre-rendered html instead",
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Resend has no public health endpoint; a lightweight authenticated
      // call to list domains confirms the API key is valid and reachable.
      const response = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Console provider for development/testing
export class ConsoleEmailProvider implements EmailProvider {
  name = "console";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.log("[EMAIL]", {
      to: message.to,
      subject: message.subject,
      from: message.from,
    });
    return { success: true, messageId: `console-${Date.now()}` };
  }

  async sendTemplate(
    to: string,
    templateId: string,
    data: Record<string, unknown>
  ): Promise<EmailSendResult> {
    console.log("[EMAIL TEMPLATE]", { to, templateId, data });
    return { success: true, messageId: `console-${Date.now()}` };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
