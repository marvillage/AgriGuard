import type { Metadata } from "next";
import { RiskCenter } from "@/components/dashboard/risk-center";

export const metadata: Metadata = {
  title: "Risk Center",
};

export default function RiskPage() {
  return <RiskCenter />;
}
