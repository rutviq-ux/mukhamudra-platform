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
