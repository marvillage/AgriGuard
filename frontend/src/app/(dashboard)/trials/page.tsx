import type { Metadata } from "next";
import { Suspense } from "react";
import { TrialsWorkspace } from "@/components/trials/trials-workspace";

export const metadata: Metadata = {
  title: "Field Trials",
};

export default function TrialsPage() {
  return (
    <Suspense fallback={null}>
      <TrialsWorkspace />
    </Suspense>
  );
}
