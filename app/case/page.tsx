import type { Metadata } from "next";
import { CaseView } from "@/components/case-view";

export const metadata: Metadata = { title: "Your plan" };

export default function CasePage() {
  return <CaseView />;
}
