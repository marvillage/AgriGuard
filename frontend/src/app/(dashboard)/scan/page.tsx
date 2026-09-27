import type { Metadata } from "next";
import { ScanWorkspace } from "@/components/scan/scan-workspace";

export const metadata: Metadata = {
  title: "Crop Scan",
};

export default function ScanPage() {
  return <ScanWorkspace />;
}
