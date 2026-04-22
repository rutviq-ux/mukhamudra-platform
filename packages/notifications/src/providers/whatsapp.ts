// WhatsApp Provider Interface
// Allows swapping between whatsapp-web.js and official WhatsApp Business API

export interface WhatsAppMessage {
  to: string; // Phone number with country code
  body: string;
  templateName?: string;
  templateData?: Record<string, unknown>;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppProvider {
  name: string;
  
  /**
   * Send a text message
   */
  send(message: WhatsAppMessage): Promise<WhatsAppSendResult>;
  
  /**
   * Check if this provider is ready (authenticated)
   */
  isReady(): Promise<boolean>;
  
  /**
   * Get the QR code for authentication (if applicable)
   */
  getQRCode?(): Promise<string | null>;
}

// Console provider for development/testing
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

// Placeholder for WhatsApp Business API (official)
// To be implemented when migrating from whatsapp-web.js
export class WhatsAppBusinessProvider implements WhatsAppProvider {
  name = "whatsapp-business";
  
  private accessToken: string;
  private phoneNumberId: string;

  constructor(config: { accessToken: string; phoneNumberId: string }) {
    this.accessToken = config.accessToken;
    this.phoneNumberId = config.phoneNumberId;
  }

  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    // TODO: Implement official WhatsApp Business API
    // This is a placeholder for future migration
    console.log("[WHATSAPP BUSINESS API - NOT IMPLEMENTED]", message);
    return {
      success: false,
      error: "WhatsApp Business API not yet implemented. Use wa-bot service.",
    };
  }

  async isReady(): Promise<boolean> {
    return !!this.accessToken && !!this.phoneNumberId;
  }
}
