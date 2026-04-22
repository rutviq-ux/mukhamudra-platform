"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@ru/ui";

interface QrData {
  qr: string | null;
  status: string;
  generatedAt: string | null;
  message?: string;
}

export function WhatsAppQrDisplay() {
  const [data, setData] = useState<QrData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQr = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp-qr");
      const json = await res.json();
      setData(json);
    } catch {
      setData({ qr: null, status: "error", generatedAt: null, message: "Failed to fetch" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQr();
    // Poll every 5 seconds when waiting for QR scan
    const interval = setInterval(fetchQr, 5000);
    return () => clearInterval(interval);
  }, [fetchQr]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading QR status...</p>;
  }

  if (!data || data.status === "no_data") {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground mb-2">
          {data?.message || "No QR code available."}
        </p>
        <p className="text-xs text-muted-foreground">
          Start the WhatsApp bot service to generate a QR code.
        </p>
      </div>
    );
  }

  if (data.status === "authenticated") {
    return (
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-success/20 px-4 py-2 text-sm font-medium text-success">
          <span className="h-2 w-2 rounded-full bg-success" />
          WhatsApp Connected
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          The bot is authenticated and processing messages.
        </p>
      </div>
    );
  }

  if (data.qr) {
    // Generate QR code as SVG using a simple client-side approach
    return (
      <div className="text-center py-4">
        <p className="text-sm font-medium mb-3">
          Scan this QR code with WhatsApp
        </p>
        <QrImage value={data.qr} />
        {data.generatedAt && (
          <p className="text-xs text-muted-foreground mt-3">
            Generated {new Date(data.generatedAt).toLocaleTimeString()}
          </p>
        )}
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchQr}>
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground text-center py-6">
      Waiting for QR code from bot service...
    </p>
  );
}

/** Simple QR code renderer using canvas */
function QrImage({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically import qrcode library if available, otherwise show raw data
    import("qrcode")
      .then((QRCode) => {
        QRCode.toDataURL(value, { width: 256, margin: 2 })
          .then(setSrc)
          .catch(() => setSrc(null));
      })
      .catch(() => setSrc(null));
  }, [value]);

  if (!src) {
    return (
      <div className="inline-block rounded-lg border bg-white p-4">
        <p className="text-xs text-muted-foreground break-all max-w-[256px]">
          QR data available but renderer not loaded. Install &quot;qrcode&quot; package
          or scan via terminal.
        </p>
      </div>
    );
  }

  return (
    <div className="inline-block rounded-lg border bg-white p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="WhatsApp QR Code" width={256} height={256} />
    </div>
  );
}
