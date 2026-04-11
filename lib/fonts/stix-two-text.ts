import { STIX_Two_Text } from "next/font/google";

/** Article body paragraphs on the public article page; headings keep the app default (Geist). */
export const stixTwoText = STIX_Two_Text({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-stix-two-text",
  display: "swap",
});
