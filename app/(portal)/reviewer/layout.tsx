import type { ReactNode } from "react";
import { DashboardPanelLayout } from "@/components/dashboard-panel-layout";
import { ReviewerSidebar } from "@/components/reviewer-sidebar";

export default function ReviewerLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardPanelLayout sidebar={<ReviewerSidebar />}>
      {children}
    </DashboardPanelLayout>
  );
}
