import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pranayama | Daily Live Breathwork",
  description:
    "Join our daily live pranayama classes. Morning and evening batches, 500+ active members. ₹1,111/month, cancel anytime.",
};

export default function PranayamaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
