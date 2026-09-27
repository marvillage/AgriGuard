import type { Metadata } from "next";
import { CopilotChat } from "@/components/copilot/copilot-chat";

export const metadata: Metadata = {
  title: "AI Copilot",
};

export default function CopilotPage() {
  return <CopilotChat />;
}
