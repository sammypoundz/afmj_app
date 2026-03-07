import {
  LayoutDashboard,
  Inbox,
  Clock,
  RefreshCcw,
  CheckCircle,
  XCircle,
  UploadCloud,
  Users,
  UserCheck,
  UserPlus,
  BookOpen,
  BarChart3,
  Settings,
  Shield,
} from "lucide-react";

export const eicMenu = [
  {
    section: "Main",
    items: [{ label: "Dashboard", icon: LayoutDashboard }],
  },

  {
    section: "Manuscripts",
    items: [
      { label: "New Submissions", icon: Inbox },
      { label: "Under Review", icon: Clock },
      { label: "Revision Requested", icon: RefreshCcw },
      { label: "Revised", icon: CheckCircle },
      { label: "Accepted", icon: CheckCircle },
      { label: "Rejected", icon: XCircle },
    ],
  },

  {
    section: "Publications",
    items: [
      { label: "Publication Decision", icon: CheckCircle },
      { label: "Published", icon: UploadCloud },
    ],
  },

  {
    section: "Users",
    items: [
      { label: "Reviewers", icon: Users },
      { label: "Editors", icon: UserCheck },
      { label: "Authors", icon: UserPlus },
    ],
  },

  {
    section: "System",
    items: [
      { label: "Analytics", icon: BarChart3 },
      { label: "Settings", icon: Settings },
      { label: "Profile & Logs", icon: Shield },
    ],
  },
];