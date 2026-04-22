"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
} from "@ru/ui";
import {
  CreditCard,
  RefreshCw,
  Film,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
} from "lucide-react";

interface Plan {
  id: string;
  slug: string;
  name: string;
  type: string;
  interval: string | null;
  amountPaise: number;
  razorpayPlanId: string | null;
  productName: string;
  productType: string;
}

interface Batch {
  id: string;
  slug: string;
  name: string;
  productType: string;
  startTime: string;
  daysOfWeek: number[];
}

interface Props {
  plans: Plan[];
  batches: Batch[];
  user: { name: string; email: string };
}

type CheckoutMode = "subscription" | "one-time" | "recording-addon";
type LogEntry = {
  time: string;
  type: "info" | "success" | "error" | "request" | "response";
  message: string;
  data?: unknown;
};

export function DemoCheckoutClient({ plans, batches, user }: Props) {
  const [mode, setMode] = useState<CheckoutMode>("subscription");
  const [selectedPlanSlug, setSelectedPlanSlug] = useState("");
  const [selectedBatchSlug, setSelectedBatchSlug] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const selectedPlan = plans.find((p) => p.slug === selectedPlanSlug);

  // Filter plans by mode
  const subscriptionPlans = plans.filter((p) => p.type === "SUBSCRIPTION");
  const oneTimePlans = plans.filter(
    (p) => p.type !== "SUBSCRIPTION" && p.slug !== "recording-addon"
  );

  // Filter batches by selected plan's product
  const availableBatches = selectedPlan
    ? selectedPlan.productType === "BUNDLE"
      ? batches
      : batches.filter((b) => b.productType === selectedPlan.productType)
    : [];

  const addLog = (
    type: LogEntry["type"],
    message: string,
    data?: unknown
  ) => {
    const time = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [{ time, type, message, data }, ...prev]);
  };

  const handleSubscriptionCheckout = async () => {
    if (!selectedPlanSlug) return;
    setIsLoading(true);

    const body = {
      planSlug: selectedPlanSlug,
      ...(selectedBatchSlug ? { batchSlug: selectedBatchSlug } : {}),
    };

    addLog("request", "POST /api/razorpay/subscription", body);

    try {
      const res = await fetch("/api/razorpay/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      addLog("response", `${res.status} ${res.statusText}`, data);

      if (!res.ok) {
        addLog("error", data.error || "API returned error");
        return;
      }

      if (data.subscriptionId) {
        addLog("info", "Opening Razorpay subscription checkout...");
        openRazorpaySubscription(data);
      }
    } catch (err) {
      addLog("error", `Network error: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOneTimeCheckout = async () => {
    if (!selectedPlanSlug) return;
    setIsLoading(true);

    const body = {
      planSlug: selectedPlanSlug,
      ...(couponCode ? { couponCode } : {}),
    };

    addLog("request", "POST /api/razorpay/checkout", body);

    try {
      const res = await fetch("/api/razorpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      addLog("response", `${res.status} ${res.statusText}`, data);

      if (!res.ok) {
        addLog("error", data.error || "API returned error");
        return;
      }

      if (data.orderId) {
        addLog("info", "Opening Razorpay order checkout...");
        openRazorpayOrder(data);
      }
    } catch (err) {
      addLog("error", `Network error: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordingAddon = async () => {
    setIsLoading(true);
    addLog("request", "POST /api/razorpay/recording-addon", {});

    try {
      const res = await fetch("/api/razorpay/recording-addon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      addLog("response", `${res.status} ${res.statusText}`, data);

      if (!res.ok) {
        addLog("error", data.error || "API returned error");
        return;
      }

      if (data.orderId) {
        addLog("info", "Opening Razorpay recording add-on checkout...");
        openRazorpayOrder(data);
      }
    } catch (err) {
      addLog("error", `Network error: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openRazorpaySubscription = (data: {
    subscriptionId: string;
    keyId?: string;
    prefill?: { name: string; email: string; contact: string };
  }) => {
    const options = {
      key:
        data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      subscription_id: data.subscriptionId,
      name: "Mukha Mudra",
      description: `Demo — ${selectedPlan?.name || "Subscription"}`,
      handler: function (response: Record<string, string>) {
        addLog("success", "Payment successful!", response);
      },
      modal: {
        ondismiss: function () {
          addLog("info", "Checkout modal dismissed by user");
        },
      },
      prefill: data.prefill || {
        name: user.name,
        email: user.email,
      },
      theme: { color: "#2E9E86" },
    };

    addLog("info", "Razorpay options", {
      key: options.key ? `${String(options.key).slice(0, 12)}...` : "missing",
      subscription_id: options.subscription_id,
    });

    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", function (response: { error: Record<string, string> }) {
      addLog("error", "Payment failed", response.error);
    });
    rzp.open();
  };

  const openRazorpayOrder = (data: {
    orderId: string;
    amount: number;
    currency: string;
    keyId?: string;
    prefill?: { name: string; email: string; contact: string };
  }) => {
    const options = {
      key:
        data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: data.currency || "INR",
      order_id: data.orderId,
      name: "Mukha Mudra",
      description: `Demo — ${selectedPlan?.name || "Order"}`,
      handler: function (response: Record<string, string>) {
        addLog("success", "Payment successful!", response);
      },
      modal: {
        ondismiss: function () {
          addLog("info", "Checkout modal dismissed by user");
        },
      },
      prefill: data.prefill || {
        name: user.name,
        email: user.email,
      },
      theme: { color: "#2E9E86" },
    };

    addLog("info", "Razorpay options", {
      key: options.key ? `${String(options.key).slice(0, 12)}...` : "missing",
      order_id: options.order_id,
      amount: `₹${(options.amount / 100).toLocaleString("en-IN")}`,
    });

    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", function (response: { error: Record<string, string> }) {
      addLog("error", "Payment failed", response.error);
    });
    rzp.open();
  };

  const handleCheckout = () => {
    if (mode === "subscription") handleSubscriptionCheckout();
    else if (mode === "one-time") handleOneTimeCheckout();
    else handleRecordingAddon();
  };

  const copyLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.time}] ${l.type.toUpperCase()}: ${l.message}${l.data ? "\n" + JSON.stringify(l.data, null, 2) : ""}`
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        {/* ─── Checkout Config ─── */}
        <Card glass>
          <CardHeader>
            <CardTitle>Checkout Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Mode */}
            <div className="space-y-2">
              <Label>Checkout Type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    {
                      value: "subscription",
                      label: "Subscription",
                      icon: RefreshCw,
                    },
                    {
                      value: "one-time",
                      label: "One-time",
                      icon: CreditCard,
                    },
                    {
                      value: "recording-addon",
                      label: "Recording",
                      icon: Film,
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setMode(opt.value);
                      setSelectedPlanSlug("");
                      setSelectedBatchSlug("");
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-[4px] text-sm border transition-colors ${
                      mode === opt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan selection (not for recording add-on) */}
            {mode !== "recording-addon" && (
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={selectedPlanSlug}
                  onValueChange={(v) => {
                    setSelectedPlanSlug(v);
                    setSelectedBatchSlug("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(mode === "subscription"
                      ? subscriptionPlans
                      : oneTimePlans
                    ).map((plan) => (
                      <SelectItem key={plan.slug} value={plan.slug}>
                        <div className="flex items-center gap-2">
                          <span>{plan.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({plan.productName}) — ₹
                            {(plan.amountPaise / 100).toLocaleString("en-IN")}
                            {plan.interval === "ANNUAL"
                              ? "/yr"
                              : plan.interval === "MONTHLY"
                                ? "/mo"
                                : ""}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Batch selection (subscription only, non-bundle) */}
            {mode === "subscription" &&
              selectedPlan &&
              selectedPlan.productType !== "BUNDLE" && (
                <div className="space-y-2">
                  <Label>Batch</Label>
                  <Select
                    value={selectedBatchSlug}
                    onValueChange={setSelectedBatchSlug}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a batch..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBatches.map((batch) => (
                        <SelectItem key={batch.slug} value={batch.slug}>
                          <div className="flex items-center gap-2">
                            <span>{batch.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {batch.startTime} —{" "}
                              {batch.daysOfWeek
                                .map((d) => dayLabels[d])
                                .join("/")}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            {/* Coupon (one-time only) */}
            {mode === "one-time" && (
              <div className="space-y-2">
                <Label>Coupon Code (optional)</Label>
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. WELCOME20"
                  className="uppercase"
                />
              </div>
            )}

            {/* Selected Plan Details */}
            {selectedPlan && mode !== "recording-addon" && (
              <div className="p-4 rounded-[4px] bg-muted/50 border border-border/50 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product</span>
                  <span>{selectedPlan.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">
                    ₹
                    {(selectedPlan.amountPaise / 100).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{selectedPlan.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slug</span>
                  <code className="text-xs font-mono">
                    {selectedPlan.slug}
                  </code>
                </div>
                {selectedPlan.razorpayPlanId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Razorpay Plan</span>
                    <code className="text-xs font-mono">
                      {selectedPlan.razorpayPlanId}
                    </code>
                  </div>
                )}
              </div>
            )}

            {mode === "recording-addon" && (
              <div className="p-4 rounded-[4px] bg-muted/50 border border-border/50 text-sm text-muted-foreground">
                Recording add-on requires an active annual membership. The API
                will check eligibility and create a ₹1,000 one-time order.
              </div>
            )}

            {/* Checkout Button */}
            <Button
              size="lg"
              className="w-full"
              disabled={
                isLoading ||
                (mode !== "recording-addon" && !selectedPlanSlug) ||
                (mode === "subscription" &&
                  selectedPlan?.productType !== "BUNDLE" &&
                  !selectedBatchSlug)
              }
              onClick={handleCheckout}
            >
              {isLoading
                ? "Processing..."
                : mode === "recording-addon"
                  ? "Test Recording Add-on — ₹1,000"
                  : selectedPlan
                    ? `Test Checkout — ₹${(selectedPlan.amountPaise / 100).toLocaleString("en-IN")}`
                    : "Select a plan"}
            </Button>
          </CardContent>
        </Card>

        {/* ─── Test Cards Reference ─── */}
        <Card glass>
          <CardHeader>
            <CardTitle>Razorpay Test Cards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use these cards in Razorpay test mode. The OTP for test mode is
              always <code className="bg-muted px-1.5 py-0.5 rounded">1234</code>.
            </p>

            <div className="space-y-3">
              {[
                {
                  label: "Successful Payment",
                  number: "4111 1111 1111 1111",
                  note: "Visa — any future expiry, any CVV",
                  color: "text-success",
                },
                {
                  label: "Mastercard",
                  number: "5267 3181 8797 5449",
                  note: "Any future expiry, any CVV",
                  color: "text-success",
                },
                {
                  label: "Indian Domestic",
                  number: "4718 6091 0820 4366",
                  note: "For testing Indian bank flows",
                  color: "text-primary",
                },
                {
                  label: "Failed Payment",
                  number: "4111 1111 1111 1129",
                  note: "Will fail after OTP step",
                  color: "text-destructive",
                },
                {
                  label: "International Card",
                  number: "4012 0010 3714 1112",
                  note: "Visa international test card",
                  color: "text-primary",
                },
              ].map((card) => (
                <div
                  key={card.number}
                  className="flex items-center justify-between p-3 rounded-[4px] bg-muted/50 border border-border/50"
                >
                  <div>
                    <div className={`text-sm font-medium ${card.color}`}>
                      {card.label}
                    </div>
                    <code className="text-sm font-mono">{card.number}</code>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {card.note}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        card.number.replace(/\s/g, "")
                      )
                    }
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy card number"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-[4px] bg-primary/5 border border-primary/20 text-sm">
              <p className="font-medium text-primary mb-1">UPI Test</p>
              <p className="text-muted-foreground">
                Use UPI ID <code className="bg-muted px-1 rounded">success@razorpay</code> for
                successful payments, or <code className="bg-muted px-1 rounded">failure@razorpay</code> for
                failures.
              </p>
            </div>

            <div className="p-3 rounded-[4px] bg-warning/5 border border-warning/20 text-sm">
              <p className="font-medium text-warning mb-1">Netbanking Test</p>
              <p className="text-muted-foreground">
                Select any bank. Test mode auto-succeeds for netbanking. Use the
                &quot;Fail&quot; button on the test bank page to simulate failure.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Debug Log ─── */}
      <Card glass>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Debug Log
              {logs.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {logs.length}
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              {logs.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyLogs}
                    className="text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogs([])}
                    className="text-xs text-destructive"
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No events yet. Start a checkout to see the API flow here.
            </p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto font-mono text-xs">
              {logs.map((log, i) => {
                const Icon =
                  log.type === "success"
                    ? CheckCircle
                    : log.type === "error"
                      ? XCircle
                      : log.type === "request"
                        ? CreditCard
                        : log.type === "response"
                          ? RefreshCw
                          : AlertTriangle;
                const color =
                  log.type === "success"
                    ? "text-success"
                    : log.type === "error"
                      ? "text-destructive"
                      : log.type === "request"
                        ? "text-primary"
                        : log.type === "response"
                          ? "text-accent"
                          : "text-muted-foreground";

                return (
                  <div
                    key={i}
                    className="p-3 rounded-[4px] bg-muted/30 border border-border/30"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-3 w-3 ${color}`} />
                      <span className="text-muted-foreground">{log.time}</span>
                      <span className={`uppercase font-semibold ${color}`}>
                        {log.type}
                      </span>
                    </div>
                    <p className="text-foreground">{log.message}</p>
                    {log.data != null && (
                      <pre className="mt-2 p-2 rounded bg-background/50 text-muted-foreground overflow-x-auto">
                        {String(JSON.stringify(log.data, null, 2))}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </>
  );
}
