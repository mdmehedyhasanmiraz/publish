import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { DashboardPanelLayout } from "@/components/dashboard-panel-layout";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardPanelLayout sidebar={<AdminSidebar />}>
      {children}
    </DashboardPanelLayout>
  );
}
