import type { Metadata } from "next";
import { ValidationWorkspace } from "@/components/validation/validation-workspace";

export const metadata: Metadata = {
  title: "Testing & results",
};

export default function ValidationPage() {
  return <ValidationWorkspace />;
}
