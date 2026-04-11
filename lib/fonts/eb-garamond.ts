import { EB_Garamond } from "next/font/google";

/** Used for article body paragraphs on public article pages; headings keep the app default (Geist). */
export const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  display: "swap",
});
