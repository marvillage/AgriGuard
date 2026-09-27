import type { Metadata } from "next";
import { RecommendationList } from "@/components/recommendations/recommendation-list";

export const metadata: Metadata = {
  title: "Recommendations",
};

export default function RecommendationsPage() {
  return <RecommendationList />;
}
