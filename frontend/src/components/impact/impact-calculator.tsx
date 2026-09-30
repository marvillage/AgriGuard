"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, Droplets, IndianRupee, Leaf, Zap } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { formatCo2, formatLitres, formatNumber, formatRupees } from "@/lib/format";
import {
  assumptions,
  crops,
  estimateSeasonImpact,
  irrigationMethods,
  kwhPerKilolitre,
  type CropId,
  type IrrigationId,
} from "@/lib/impact";
import { cn } from "@/lib/utils";

export function ImpactCalculator({ className }: { className?: string }) {
  const { t, tx, language } = useI18n();
  const acresId = useId();
  const [acres, setAcres] = useState(5);
  const [cropId, setCropId] = useState<CropId>("wheat");
  const [irrigationId, setIrrigationId] = useState<IrrigationId>("flood");
  const [showAssumptions, setShowAssumptions] = useState(false);

  const result = useMemo(
    () => estimateSeasonImpact(acres, cropId, irrigationId),
    [acres, cropId, irrigationId]
  );

  const tiles = [
    {
      icon: Droplets,
      label: t("sustainability.calcWaterSaved"),
      value: formatLitres(result.litresSaved, language),
      hint: t("sustainability.calcWaterHint", {
        pct: Math.round(result.savingRate * 100),
        baseline: formatLitres(result.baselineLitres, language),
      }),
    },
    {
      icon: Zap,
      label: t("sustainability.calcEnergy"),
      value: t("sustainability.unitKwh", { value: formatNumber(result.kwhSaved, 0, language) }),
      hint: t("sustainability.calcEnergyHint"),
    },
    {
      icon: Leaf,
      label: t("sustainability.calcCo2"),
      value: formatCo2(result.co2Kg, language),
      hint: t("sustainability.calcCo2Hint", { kg: formatNumber(result.ureaKgSaved, 0, language) }),
    },
    {
      icon: IndianRupee,
      label: t("sustainability.calcMoney"),
      value: formatRupees(result.rupees, language),
      hint: t("sustainability.calcMoneyHint"),
    },
  ];

  const assumptionLines = [
    t("sustainability.calcAssumptionWater"),
    t("sustainability.calcAssumptionSaving"),
    t("sustainability.calcAssumptionPump", {
      head: assumptions.pumpHeadMetres,
      efficiency: assumptions.pumpEfficiency * 100,
      kwh: formatNumber(kwhPerKilolitre, 1, language),
    }),
    t("sustainability.calcAssumptionFactors", {
      grid: assumptions.gridKgCo2PerKwh,
      tariff: assumptions.rupeesPerKwh,
      urea: assumptions.rupeesPerKgUrea,
      rate: assumptions.fertilizerSavingRate * 100,
    }),
    t("sustainability.calcAssumptionPlanning"),
  ];

  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-lift lg:grid-cols-[0.9fr_1.1fr]",
        className
      )}
    >
      <div className="space-y-7 p-6 sm:p-8">
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={acresId} className="text-sm font-semibold text-ink">
              {t("sustainability.calcFarmSize")}
            </label>
            <span className="font-display text-2xl font-bold text-navy-900">
              {formatNumber(acres, 0, language)}{" "}
              <span className="text-sm font-medium text-slate-500">{t("common.acres")}</span>
            </span>
          </div>
          <input
            id={acresId}
            type="range"
            min={1}
            max={50}
            value={acres}
            onChange={(event) => setAcres(Number(event.target.value))}
            className="mt-4 w-full cursor-pointer accent-sun-500"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>{formatNumber(1, 0, language)}</span>
            <span>{formatNumber(50, 0, language)}</span>
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-ink">{t("sustainability.calcMainCrop")}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {crops.map((crop) => (
              <ChoiceChip key={crop.id} selected={crop.id === cropId} onClick={() => setCropId(crop.id)}>
                {tx(`sustainability.calcCrop_${crop.id}`)}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-ink">{t("sustainability.calcCurrentIrrigation")}</legend>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {irrigationMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                aria-pressed={method.id === irrigationId}
                onClick={() => setIrrigationId(method.id)}
                className={cn(
                  "cursor-pointer rounded-lg px-2 py-2 text-xs font-semibold transition-all sm:text-sm",
                  method.id === irrigationId ? "bg-white text-ink shadow-soft" : "text-slate-500 hover:text-ink"
                )}
              >
                {tx(`sustainability.calcMethod_${method.id}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <button
            type="button"
            onClick={() => setShowAssumptions((value) => !value)}
            aria-expanded={showAssumptions}
            className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-navy-900"
          >
            {t("sustainability.calcHow")}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAssumptions && "rotate-180")} />
          </button>
          {showAssumptions ? (
            <ul className="mt-3 animate-fade-up space-y-1.5 text-xs leading-relaxed text-slate-500">
              {assumptionLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="relative bg-navy-950 p-6 text-white sm:p-8">
        <div className="bg-aurora absolute inset-0" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs font-semibold tracking-widest text-sun-400 uppercase">
            {t("sustainability.calcResultsTitle")}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-live="polite">
            {tiles.map(({ icon: Icon, label, value, hint }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors hover:bg-white/[0.07]"
              >
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun-400/15 text-sun-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </div>
                <p className="mt-3 font-display text-3xl font-bold tracking-tight">{value}</p>
                <p className="mt-1 text-xs text-white/45">{hint}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
        selected
          ? "border-sun-400 bg-sun-400 text-ink shadow-glow"
          : "border-slate-200 bg-white text-slate-600 hover:border-sun-300 hover:bg-sun-50"
      )}
    >
      {children}
    </button>
  );
}
