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
  PlusSquare,
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
      { label: "Revision Requested", icon: RefreshCcw },   // new
      { label: "Revised", icon: CheckCircle },             // new (you can replace with a different icon if desired)
      { label: "Accepted", icon: CheckCircle },
      { label: "Rejected", icon: XCircle },
      { label: "Published", icon: UploadCloud },
    ],
  },

  // Users
  {
    section: "Users",
    items: [
      { label: "Reviewers", icon: Users },
      { label: "Editors", icon: UserCheck },
      { label: "Authors", icon: UserPlus },
    ],
  },

  {
    section: "Publications",
    items: [
      { label: "Journal Issues", icon: BookOpen },
      { label: "Create Issue", icon: PlusSquare },
      { label: "Publication Decision", icon: CheckCircle },
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