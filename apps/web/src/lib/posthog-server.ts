import { PostHog } from "posthog-node";

let _posthog: PostHog | null = null;

export function getPostHogServer(): PostHog {
  if (!_posthog) {
    _posthog = new PostHog(process.env.local || "", {
      host: process.env.local || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
      enableExceptionAutocapture: true,
    });
  }
  return _posthog;
}
