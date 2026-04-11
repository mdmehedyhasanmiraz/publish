import type { ReactNode } from "react";
import { DashboardPanelLayout } from "@/components/dashboard-panel-layout";
import { ProductionSidebar } from "@/components/production-sidebar";

export default function ProductionLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardPanelLayout sidebar={<ProductionSidebar />}>
      {children}
    </DashboardPanelLayout>
  );
}
