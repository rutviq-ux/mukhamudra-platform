interface SubscriptionPeriodSource {
  current_start: number;
  current_end: number;
}

export function getSubscriptionPeriod({
  current_start,
  current_end,
}: SubscriptionPeriodSource) {
  return {
    periodStart: new Date(current_start * 1000),
    periodEnd: new Date(current_end * 1000),
  };
}
