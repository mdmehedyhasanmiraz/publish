import type { ReactNode } from "react";
import { PortalHeader } from "@/components/portal-header";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-teal-100">
      <PortalHeader />
      {children}
    </div>
  );
}
