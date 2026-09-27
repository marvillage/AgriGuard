"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/i18n/provider";
import type { FieldMapProps } from "./field-map-inner";

export type { Basemap, NdviLayer } from "./field-map-inner";

const FieldMapInner = dynamic(() => import("./field-map-inner").then((mod) => mod.FieldMapInner), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  const { t } = useI18n();
  return (
    <div className="flex h-full w-full animate-pulse items-center justify-center bg-slate-100 text-sm text-slate-500">
      {t("field.mapLoading")}
    </div>
  );
}

export function FieldMap(props: FieldMapProps) {
  return <FieldMapInner {...props} />;
}
