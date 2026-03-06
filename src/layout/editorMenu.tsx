import {
  LayoutDashboard,
  Inbox,
  Clock,
  RefreshCcw,
  CheckCircle,
  XCircle,
} from "lucide-react";

export const editorMenu = [
  {
    section: "Main",
    items: [{ label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    section: "Manuscripts",
    items: [
      { label: "New Submissions", icon: Inbox },
      { label: "Under Review", icon: Clock },
      { label: "Revisions", icon: RefreshCcw },
      { label: "Accepted", icon: CheckCircle },
      { label: "Rejected", icon: XCircle },
    ],
  },
];
