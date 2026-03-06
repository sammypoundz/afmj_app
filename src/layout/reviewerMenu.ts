import {
  LayoutDashboard,
  Mail,
  Clock,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export const reviewerMenu = [
  {
    section: "Main",
    items: [{ label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    section: "Reviews",
    items: [
      { label: "Invitations", icon: Mail },
      { label: "Active Reviews", icon: Clock },
      { label: "Revisions", icon: RefreshCcw },
      { label: "Completed", icon: CheckCircle },
      { label: "Overdue", icon: AlertTriangle },
    ],
  },
];