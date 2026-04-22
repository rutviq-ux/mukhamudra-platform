import {
  Users,
  Calendar,
  CreditCard,
  Settings,
  MessageSquare,
  Webhook,
  LayoutDashboard,
  BookOpen,
  Ticket,
  RefreshCw,
  FlaskConical,
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  HelpCircle,
  UserPlus,
  Tag,
  ScrollText,
  Workflow,
  Megaphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/coaches", label: "Coaches", icon: UserCheck },
  { href: "/admin/batches", label: "Batches", icon: Calendar },
  { href: "/admin/sessions", label: "Sessions", icon: BookOpen },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: RefreshCw },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/leads", label: "Leads", icon: UserPlus },
  { href: "/admin/plans", label: "Plans", icon: Tag },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/affiliate-products", label: "Affiliate Products", icon: ShoppingBag },
  { href: "/admin/sequences", label: "Sequences", icon: Workflow },
  { href: "/admin/broadcasts", label: "Broadcasts", icon: Megaphone },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/admin/demo-checkout", label: "Demo Checkout", icon: FlaskConical },
  { href: "/admin/audit-logs", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/super-settings", label: "Super Settings", icon: ShieldCheck },
  { href: "/admin/guide", label: "Guide", icon: HelpCircle },
];
