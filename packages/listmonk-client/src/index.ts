// Listmonk API Client
// Typed wrapper for Listmonk email marketing platform

export interface ListmonkSubscriber {
  id?: number;
  uuid?: string;
  email: string;
  name: string;
  status: "enabled" | "disabled" | "blocklisted";
  lists?: number[];
  attribs?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ListmonkList {
  id: number;
  uuid: string;
  name: string;
  type: "public" | "private";
  optin: "single" | "double";
  tags: string[];
  subscriber_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ListmonkCampaign {
  id: number;
  uuid: string;
  name: string;
  subject: string;
  from_email: string;
  status: "draft" | "running" | "scheduled" | "paused" | "cancelled" | "finished";
  type: "regular" | "optin";
  tags: string[];
  template_id: number;
  lists: { id: number; name: string }[];
  created_at: string;
  updated_at: string;
}

export interface ListmonkClientConfig {
  url: string;
  username: string;
  password: string;
}

export interface CreateSubscriberOptions {
  email: string;
  name?: string;
  status?: "enabled" | "disabled";
  lists?: number[];
  attribs?: Record<string, unknown>;
  preconfirm_subscriptions?: boolean;
}

export interface SendTransactionalOptions {
  subscriber_email?: string;
  subscriber_id?: number;
  template_id: number;
  data?: Record<string, unknown>;
  content_type?: "html" | "plain" | "markdown";
  from_email?: string;
}

export class ListmonkClient {
  private url: string;
  private authHeader: string;

  constructor(config: ListmonkClientConfig) {
    this.url = config.url.replace(/\/$/, "");
    this.authHeader = `Basic ${Buffer.from(
      `${config.username}:${config.password}`
    ).toString("base64")}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.url}/api${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Listmonk API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Subscriber Management
  async createSubscriber(
    options: CreateSubscriberOptions
  ): Promise<{ data: ListmonkSubscriber }> {
    return this.request<{ data: ListmonkSubscriber }>("/subscribers", {
      method: "POST",
      body: JSON.stringify({
        email: options.email,
        name: options.name || options.email.split("@")[0],
        status: options.status || "enabled",
        lists: options.lists || [],
        attribs: options.attribs || {},
        preconfirm_subscriptions: options.preconfirm_subscriptions ?? false,
      }),
    });
  }

  async getSubscriberByEmail(
    email: string
  ): Promise<{ data: ListmonkSubscriber } | null> {
    try {
      const result = await this.request<{ data: { results: ListmonkSubscriber[] } }>(
        `/subscribers?query=subscribers.email='${encodeURIComponent(email)}'`
      );
      if (result.data.results.length === 0) {
        return null;
      }
      return { data: result.data.results[0]! };
    } catch {
      return null;
    }
  }

  async updateSubscriber(
    id: number,
    updates: Partial<CreateSubscriberOptions>
  ): Promise<{ data: ListmonkSubscriber }> {
    return this.request<{ data: ListmonkSubscriber }>(`/subscribers/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async addSubscriberToLists(
    id: number,
    listIds: number[],
    status: "confirmed" | "unconfirmed" = "unconfirmed"
  ): Promise<boolean> {
    await this.request(`/subscribers/lists`, {
      method: "PUT",
      body: JSON.stringify({
        ids: [id],
        action: "add",
        target_list_ids: listIds,
        status,
      }),
    });
    return true;
  }

  async removeSubscriberFromLists(
    id: number,
    listIds: number[]
  ): Promise<boolean> {
    await this.request(`/subscribers/lists`, {
      method: "PUT",
      body: JSON.stringify({
        ids: [id],
        action: "remove",
        target_list_ids: listIds,
      }),
    });
    return true;
  }

  // List Management
  async getLists(): Promise<{ data: { results: ListmonkList[] } }> {
    return this.request<{ data: { results: ListmonkList[] } }>("/lists");
  }

  async getPublicLists(): Promise<ListmonkList[]> {
    const response = await this.getLists();
    return response.data.results.filter((list) => list.type === "public");
  }

  // Transactional Email
  async sendTransactional(options: SendTransactionalOptions): Promise<boolean> {
    await this.request("/tx", {
      method: "POST",
      body: JSON.stringify({
        subscriber_email: options.subscriber_email,
        subscriber_id: options.subscriber_id,
        template_id: options.template_id,
        data: options.data || {},
        content_type: options.content_type || "html",
        from_email: options.from_email,
      }),
    });
    return true;
  }

  // Campaign Management
  async getCampaigns(): Promise<{ data: { results: ListmonkCampaign[] } }> {
    return this.request<{ data: { results: ListmonkCampaign[] } }>("/campaigns");
  }

  // Health Check
  async health(): Promise<boolean> {
    try {
      await this.request("/health");
      return true;
    } catch {
      return false;
    }
  }
}

// Factory function to create client from env vars
export function createListmonkClient(): ListmonkClient {
  const url = process.env.LISTMONK_URL;
  const username = process.env.LISTMONK_API_USER;
  const password = process.env.LISTMONK_API_PASSWORD;

  if (!url || !username || !password) {
    throw new Error(
      "LISTMONK_URL, LISTMONK_API_USER, and LISTMONK_API_PASSWORD must be set"
    );
  }

  return new ListmonkClient({ url, username, password });
}

export default ListmonkClient;
