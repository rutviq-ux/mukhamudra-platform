// Web Push Provider
// Uses the web-push library for VAPID-based push notifications

import webpush from "web-push";

export interface PushTarget {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushMessage {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export interface PushSendResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

export interface PushProvider {
  name: string;
  send(target: PushTarget, message: PushMessage): Promise<PushSendResult>;
}

export class VapidPushProvider implements PushProvider {
  name = "vapid";

  constructor(config: {
    publicKey: string;
    privateKey: string;
    subject: string;
  }) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  }

  async send(target: PushTarget, message: PushMessage): Promise<PushSendResult> {
    try {
      const payload = JSON.stringify({
        title: message.title,
        body: message.body,
        icon: message.icon || "/mukha_mudra_logos/mm_logo_t.png",
        badge: message.badge || "/mukha_mudra_logos/mm_logo_t.png",
        url: message.url || "/app",
        tag: message.tag,
      });

      const result = await webpush.sendNotification(
        { endpoint: target.endpoint, keys: target.keys },
        payload,
        { TTL: 60 * 60 },
      );

      return { success: true, statusCode: result.statusCode };
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      return {
        success: false,
        statusCode,
        error: error instanceof Error ? error.message : "Unknown push error",
      };
    }
  }
}

export class ConsolePushProvider implements PushProvider {
  name = "console";

  async send(target: PushTarget, message: PushMessage): Promise<PushSendResult> {
    console.log("[PUSH]", {
      endpoint: target.endpoint.substring(0, 60) + "...",
      title: message.title,
      body: message.body,
    });
    return { success: true, statusCode: 200 };
  }
}
