"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Droplets,
  FlaskConical,
  Gauge,
  IndianRupee,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Ruler,
  Sprout,
  Sun,
  Trash,
  type LucideIcon,
} from "lucide-react";
import { applyFarmPhoto, FarmFormDialog, typicalBaseline, type FarmPhoto } from "@/components/farms/farm-form-dialog";
import { FieldFormDialog } from "@/components/farms/field-form-dialog";
import { ShareFarm } from "@/components/farms/share-farm";
import { FarmWeatherCard } from "@/components/field/farm-weather-card";
import { clientErrorMessage, errorMessage } from "@/components/field/field-ui";
import { PageHeader } from "@/components/layout/page-header";
import { ImageSlot } from "@/components/ui/image-slot";
import { farmImage } from "@/lib/site-images";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api, type FarmInput, type FieldInput } from "@/lib/api";
import type { Field, FarmWithFields } from "@/lib/types";

export default function FarmDetailsPage() {
  const { t, tx, number } = useI18n();
  const params = useParams<{ farmId: string }>();
  const farmId = Number(params.farmId);
  const valid = Number.isInteger(farmId) && farmId > 0;
  const toast = useToast();
  const queryClient = useQueryClient();
  const [fieldDialog, setFieldDialog] = useState<{ field: Field | null } | null>(null);
  const [editingFarm, setEditingFarm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Field | null>(null);
  const [error, setError] = useState<string | null>(null);
  const farmQuery = useQuery({
    queryKey: ["farm", farmId],
    queryFn: async () => (await api.getFarm(farmId)).farm,
    enabled: valid,
  });

  const refresh = async (fieldId?: number) => {
    await queryClient.invalidateQueries({ queryKey: ["farm", farmId] });
    await queryClient.invalidateQueries({ queryKey: ["farms"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    if (fieldId) await queryClient.invalidateQueries({ queryKey: ["field", fieldId] });
  };
  const saveField = useMutation({
    mutationFn: ({ fieldId, values }: { fieldId: number | null; values: FieldInput & { name: string; area: number } }) =>
      fieldId ? api.updateField(farmId, fieldId, values) : api.createField(farmId, values),
    onSuccess: async ({ field }, { fieldId }) => {
      toast({ title: fieldId ? t("farms.fieldUpdated", { name: field.name }) : t("farms.fieldCreated", { name: field.name }), tone: "success" });
      setFieldDialog(null);
      await refresh(field.id);
    },
  });
  const deleteField = useMutation({
    mutationFn: async (field: Field) => {
      await api.deleteField(farmId, field.id);
      return field;
    },
    onSuccess: async (field) => {
      toast({ title: t("farms.fieldDeleted", { name: field.name }), tone: "success" });
      await refresh();
    },
    onError: (requestError) => setError(clientErrorMessage(requestError, t("farms.deleteRetry"))),
  });
  const updateFarm = useMutation({
    mutationFn: async ({ values, photo }: { values: FarmInput; photo: FarmPhoto }) => {
      const { farm } = await api.updateFarm(farmId, values);
      return { farm, photoSaved: await applyFarmPhoto(farm.id, photo) };
    },
    onSuccess: async ({ farm, photoSaved }) => {
      toast({ title: t("farms.farmUpdated", { name: farm.name }), tone: "success" });
      if (!photoSaved) toast({ title: t("farms.photoFailed"), tone: "warning" });
      setEditingFarm(false);
      await refresh();
    },
  });
  const farm = farmQuery.data;

  if (valid && farmQuery.isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-4 w-32 animate-pulse rounded-md bg-slate-200/70" />
        <div className="h-9 w-64 max-w-full animate-pulse rounded-lg bg-slate-200/70" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-20 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-2xl bg-slate-200/60" />
          <div className="h-48 animate-pulse rounded-2xl bg-slate-200/60" />
        </div>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10">
        <Alert variant="destructive">{errorMessage(farmQuery.error, t("farms.notFound"))}</Alert>
        <Link href="/farms" className={buttonVariants({ variant: "secondary" })}>
          <ArrowLeft className="h-4 w-4" />
          {t("farms.backToFarms")}
        </Link>
      </div>
    );
  }

  const isOwner = farm.access !== "advisor";
  const totalArea = farm.fields.reduce((sum, field) => sum + field.area, 0);
  const openAddField = () => {
    setError(null);
    saveField.reset();
    setFieldDialog({ field: null });
  };

  return (
    <div>
      <Link
        href="/farms"
        className="mb-5 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-500 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("farms.backToFarms")}
      </Link>
      {farm.photoKey ? (
        <ImageSlot image={farmImage(farm)} unoptimized sizes="(min-width: 1280px) 1216px, 100vw" className="mb-6 h-44 rounded-2xl sm:h-56" />
      ) : null}
      <PageHeader
        eyebrow={t("common.farm")}
        title={farm.name}
        description={farm.location || t("farms.locationNotSet")}
        action={
          <>
            <Link href={`/trials?farm=${farm.id}`} className={buttonVariants({ variant: "secondary" })}>
              <FlaskConical className="h-4 w-4" />
              {t("farms.trialsLink")}
            </Link>
            {isOwner ? (
              <>
                <Button variant="secondary" onClick={() => setEditingFarm(true)}>
                  <Pencil className="h-4 w-4" />
                  {t("farms.editFarm")}
                </Button>
                <Button onClick={openAddField}>
                  <Plus className="h-4 w-4" />
                  {t("farms.addField")}
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {!isOwner ? (
        <Alert variant="info" className="mb-6">
          <span className="font-semibold">{t("farms.access_advisor")}</span> {t("farms.readOnlyNotice")}
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryTile icon={Sprout} label={t("farms.fieldsLabel")} value={number(farm.fields.length)} />
        <SummaryTile icon={Ruler} label={t("farms.totalAreaLabel")} value={t("farms.acresValue", { value: number(totalArea, 1) })} />
        <SummaryTile icon={Droplets} label={t("farms.methodLabel")} value={tx(`farms.method_${farm.irrigationMethod}`)} />
        <SummaryTile
          icon={Sun}
          label={t("farms.solarLabel")}
          value={farm.solarCapacityKw ? t("farms.kwValue", { value: number(farm.solarCapacityKw, 1) }) : t("farms.noSolar")}
        />
      </div>

      <div className="mb-8 grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <FarmWeatherCard
            farmId={farm.id}
            hasLocation={farm.latitude !== null && farm.longitude !== null}
            onSetLocation={isOwner ? () => setEditingFarm(true) : undefined}
          />
        </div>
        <FarmSettingsCard farm={farm} />
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">{t("farms.fieldsTitle")}</h2>
          <p className="text-sm text-slate-500">{t("farms.fieldsIntro")}</p>
        </div>
      </div>

      {farm.fields.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-100 text-sun-700">
              <Sprout className="h-6 w-6" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold text-ink">{t("farms.noFieldsTitle")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("farms.noFieldsBody")}</p>
            {isOwner ? (
              <Button className="mt-5" onClick={openAddField}>
                <Plus className="h-4 w-4" />
                {t("farms.addFirstField")}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {farm.fields.map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              farm={farm}
              canEdit={isOwner}
              deleting={deleteField.isPending}
              onEdit={() => {
                setError(null);
                saveField.reset();
                setFieldDialog({ field });
              }}
              onDelete={() => setPendingDelete(field)}
            />
          ))}
        </div>
      )}

      {isOwner ? (
        <div className="mt-8">
          <ShareFarm farm={farm} />
        </div>
      ) : null}

      {fieldDialog ? (
        <FieldFormDialog
          initial={fieldDialog.field ?? undefined}
          farmMethod={farm.irrigationMethod}
          onCancel={() => setFieldDialog(null)}
          onSubmit={async (values) => {
            await saveField.mutateAsync({ fieldId: fieldDialog.field?.id ?? null, values });
          }}
        />
      ) : null}

      {editingFarm ? (
        <FarmFormDialog
          initial={farm}
          onCancel={() => setEditingFarm(false)}
          onSubmit={async (values, photo) => {
            await updateFarm.mutateAsync({ values, photo });
          }}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={t("farms.deleteFieldTitle", { name: pendingDelete.name })}
          description={t("farms.deleteFieldBody")}
          confirmLabel={t("common.delete")}
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            setError(null);
            await deleteField.mutateAsync(pendingDelete).catch(() => undefined);
            setPendingDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-soft sm:gap-4 sm:p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-sun-400 sm:h-11 sm:w-11">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <p className="truncate font-display text-base font-semibold text-ink sm:text-lg">{value}</p>
      </div>
    </div>
  );
}

function FarmSettingsCard({ farm }: { farm: FarmWithFields }) {
  const { t, tx, number } = useI18n();
  const typical = typicalBaseline[farm.irrigationMethod];
  const custom = farm.baselineDepthMm !== null && farm.baselineIntervalDays !== null;

  return (
    <Card className="h-full">
      <CardHeader>
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
          <Gauge className="h-4 w-4 text-navy-700" />
          {t("farms.settingsTitle")}
        </h3>
      </CardHeader>
      <CardContent className="pt-4">
        <dl className="divide-y divide-slate-100 text-sm">
          <SettingRow label={t("farms.methodLabel")} value={tx(`farms.method_${farm.irrigationMethod}`)} />
          <SettingRow
            label={t("farms.baselineLabel")}
            value={t("farms.baselineValue", {
              depth: number(custom ? farm.baselineDepthMm ?? 0 : typical.depth, 1),
              interval: number(custom ? farm.baselineIntervalDays ?? 0 : typical.interval, 1),
            })}
            note={custom ? t("farms.baselineCustom") : t("farms.baselineDefault")}
          />
          <SettingRow
            label={t("farms.electricityLabel")}
            value={t("farms.rateValue", { value: number(farm.electricityRate, 2) })}
            icon={<IndianRupee className="h-3.5 w-3.5 text-slate-400" />}
          />
          <SettingRow
            label={t("farms.solarLabel")}
            value={farm.solarCapacityKw ? t("farms.kwValue", { value: number(farm.solarCapacityKw, 1) }) : t("farms.noSolar")}
          />
          <SettingRow
            label={t("farms.coordinatesLabel")}
            value={
              farm.latitude !== null && farm.longitude !== null
                ? t("farms.coordinates", { lat: number(farm.latitude, 4), lng: number(farm.longitude, 4) })
                : t("common.notSet")
            }
            icon={<MapPin className="h-3.5 w-3.5 text-slate-400" />}
          />
        </dl>
        {farm.description ? <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">{farm.description}</p> : null}
      </CardContent>
    </Card>
  );
}

function SettingRow({ label, value, note, icon }: { label: string; value: string; note?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="flex items-center gap-1.5 text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="text-right">
        <span className="font-semibold text-ink tabular-nums">{value}</span>
        {note ? <span className="block text-[11px] text-slate-400">{note}</span> : null}
      </dd>
    </div>
  );
}

function FieldCard({
  field,
  farm,
  canEdit,
  deleting,
  onEdit,
  onDelete,
}: {
  field: Field;
  farm: FarmWithFields;
  canEdit: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, tx, number } = useI18n();
  const method = field.irrigationMethod ?? farm.irrigationMethod;

  return (
    <Card className="group flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/fields/${field.id}`} className="font-display text-lg font-semibold text-ink transition-colors hover:text-navy-700">
            {field.name}
          </Link>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-sun-600" />
            <span className="truncate">{field.boundary ? t("farms.boundaryMapped") : t("farms.noBoundary")}</span>
          </p>
        </div>
        {canEdit ? (
          <div className="-mt-1 -mr-2 flex shrink-0">
            <Button variant="ghost" size="icon" aria-label={t("farms.editFieldLabel", { name: field.name })} title={t("common.edit")} onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("farms.deleteFieldLabel", { name: field.name })}
              title={t("common.delete")}
              disabled={deleting}
              onClick={onDelete}
            >
              <Trash className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="navy">
            <Ruler className="h-3 w-3" />
            {t("farms.acresValue", { value: number(field.area, 2) })}
          </Badge>
          <Badge variant="secondary">
            <Layers className="h-3 w-3" />
            {field.soilType ?? t("farms.soilNotSet")}
          </Badge>
          <Badge variant="info">
            <Droplets className="h-3 w-3" />
            {field.irrigationMethod ? tx(`farms.method_${method}`) : t("farms.methodInherited", { method: tx(`farms.method_${method}`) })}
          </Badge>
          {field.solarPreferred ? (
            <Badge variant="default">
              <Sun className="h-3 w-3" />
              {t("farms.solarPreferredBadge")}
            </Badge>
          ) : null}
        </div>
        {field.pumpFlowLpm || field.pumpPowerKw ? (
          <p className="mt-3 text-xs text-slate-500 tabular-nums">
            {t("farms.pumpSummary", {
              flow: field.pumpFlowLpm ? number(field.pumpFlowLpm) : "–",
              power: field.pumpPowerKw ? number(field.pumpPowerKw, 1) : "–",
            })}
          </p>
        ) : null}
        <Link
          href={`/fields/${field.id}`}
          className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-navy-700 transition-colors hover:text-navy-900"
        >
          {t("farms.openField")}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
