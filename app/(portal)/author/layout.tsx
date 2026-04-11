import type { ReactNode } from "react";
import { AuthorLayoutShell } from "@/components/author-layout-shell";

export default function AuthorLayout({ children }: { children: ReactNode }) {
  return <AuthorLayoutShell>{children}</AuthorLayoutShell>;
}
