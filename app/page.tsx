import type { Metadata } from "next";
import { HomePageContent } from "@/components/home/home-page-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Sciencelet — Open access scholarly publishing",
  description:
    "Independent STM publisher of open access journals in AI, biotechnology, genetics, pharmaceutical science, and related fields.",
};

export default function PublisherHomePage() {
  return (
    <>
      <SiteHeader />
      <HomePageContent />
      <SiteFooter />
    </>
  );
}
