import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Face Yoga | Live Group Sessions",
  description:
    "Join our live face yoga group sessions 3x/week. 7 techniques including Face Yoga, Gua Sha, Roller, Trataka, and more.",
};

export default function FaceYogaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
