import type { ReactNode } from "react";
import { DashboardPanelLayout } from "@/components/dashboard-panel-layout";
import { EditorSidebar } from "@/components/editor-sidebar";

export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardPanelLayout sidebar={<EditorSidebar />}>
      {children}
    </DashboardPanelLayout>
  );
}
