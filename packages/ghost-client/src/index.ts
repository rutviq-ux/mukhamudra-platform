// Ghost Content API Client
// Typed wrapper for Ghost CMS Content API

import { createLogger } from "@ru/config";

const log = createLogger("ghost-client");

export interface GhostAuthor {
  id: string;
  name: string;
  slug: string;
  profile_image?: string | null;
  bio?: string | null;
  url?: string;
}

export interface GhostTag {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  feature_image?: string | null;
  visibility: string;
  url?: string;
}

export interface GhostPost {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  html?: string;
  excerpt?: string;
  feature_image?: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
  published_at: string;
  reading_time?: number;
  url?: string;
  primary_author?: GhostAuthor;
  authors?: GhostAuthor[];
  primary_tag?: GhostTag;
  tags?: GhostTag[];
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
}

export interface GhostPostsResponse {
  posts: GhostPost[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      pages: number;
      total: number;
      next: number | null;
      prev: number | null;
    };
  };
}

export interface GhostClientConfig {
  url: string;
  key: string;
  version?: string;
  timeoutMs?: number;
}

export interface GetPostsOptions {
  limit?: number;
  page?: number;
  filter?: string;
  include?: string[];
  order?: string;
  fields?: string[];
}

const EMPTY_POSTS_RESPONSE: GhostPostsResponse = {
  posts: [],
  meta: {
    pagination: { page: 1, limit: 10, pages: 0, total: 0, next: null, prev: null },
  },
};

export class GhostClient {
  private url: string;
  private key: string;
  private version: string;
  private timeoutMs: number;

  constructor(config: GhostClientConfig) {
    this.url = config.url.replace(/\/$/, "");
    this.key = config.key;
    this.version = config.version || "v5.0";
    this.timeoutMs = config.timeoutMs || 10_000;
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`/ghost/api/content/${endpoint}/`, this.url);
    url.searchParams.set("key", this.key);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value) url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  private async fetchWithTimeout(url: string, options: RequestInit & { next?: { revalidate: number } }): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private handleFetchError(error: unknown, context: string): void {
    if (error instanceof DOMException && error.name === "AbortError") {
      log.warn({ context, timeoutMs: this.timeoutMs }, "Ghost API request timed out");
      return;
    }

    const err = error as { code?: string; message?: string };
    if (err.code === "ECONNREFUSED" || err.message?.includes("fetch failed")) {
      log.warn({ context, url: this.url }, "Ghost CMS is unreachable");
    } else {
      log.error({ err: error, context }, "Ghost API request failed");
    }
  }

  async getPosts(options: GetPostsOptions = {}): Promise<GhostPostsResponse> {
    const params: Record<string, string> = {};
    if (options.limit) params.limit = String(options.limit);
    if (options.page) params.page = String(options.page);
    if (options.filter) params.filter = options.filter;
    if (options.include?.length) params.include = options.include.join(",");
    if (options.order) params.order = options.order;
    if (options.fields?.length) params.fields = options.fields.join(",");

    const url = this.buildUrl("posts", params);
    try {
      const response = await this.fetchWithTimeout(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        log.warn(
          { status: response.status, statusText: response.statusText },
          "Ghost API returned error for getPosts"
        );
        return EMPTY_POSTS_RESPONSE;
      }

      return response.json();
    } catch (error) {
      this.handleFetchError(error, "getPosts");
      return EMPTY_POSTS_RESPONSE;
    }
  }

  async getPostBySlug(
    slug: string,
    include: string[] = ["authors", "tags"],
  ): Promise<GhostPost | null> {
    const params: Record<string, string> = {};
    if (include.length) params.include = include.join(",");

    const url = this.buildUrl(`posts/slug/${slug}`, params);
    try {
      const response = await this.fetchWithTimeout(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
      });

      if (response.status === 404) return null;
      if (!response.ok) {
        log.warn(
          { status: response.status, slug },
          "Ghost API returned error for getPostBySlug"
        );
        return null;
      }

      const data = await response.json();
      return data.posts?.[0] || null;
    } catch (error) {
      this.handleFetchError(error, `getPostBySlug(${slug})`);
      return null;
    }
  }

  async getTags(options: { limit?: number } = {}): Promise<GhostTag[]> {
    const params: Record<string, string> = {};
    if (options.limit) params.limit = String(options.limit);

    const url = this.buildUrl("tags", params);
    try {
      const response = await this.fetchWithTimeout(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        log.warn(
          { status: response.status },
          "Ghost API returned error for getTags"
        );
        return [];
      }

      const data = await response.json();
      return data.tags || [];
    } catch (error) {
      this.handleFetchError(error, "getTags");
      return [];
    }
  }

  async getAuthors(options: { limit?: number } = {}): Promise<GhostAuthor[]> {
    const params: Record<string, string> = {};
    if (options.limit) params.limit = String(options.limit);

    const url = this.buildUrl("authors", params);
    try {
      const response = await this.fetchWithTimeout(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        log.warn(
          { status: response.status },
          "Ghost API returned error for getAuthors"
        );
        return [];
      }

      const data = await response.json();
      return data.authors || [];
    } catch (error) {
      this.handleFetchError(error, "getAuthors");
      return [];
    }
  }
}

export function createGhostClient(): GhostClient {
  const url = process.env.GHOST_URL || "http://localhost:2368";
  const key = process.env.GHOST_CONTENT_API_KEY || "mock_key";
  return new GhostClient({ url, key });
}

export default GhostClient;
