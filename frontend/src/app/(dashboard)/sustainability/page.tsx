import type { Metadata } from "next";
import { SustainabilityReport } from "@/components/impact/sustainability-report";

export const metadata: Metadata = {
  title: "Sustainability",
};

export default function SustainabilityPage() {
  return <SustainabilityReport />;
}
