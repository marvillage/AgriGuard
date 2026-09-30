"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Droplets, Eye, MapPin, Pencil, Plus, Ruler, Sprout, Trash, UserRound } from "lucide-react";
import { clientErrorMessage, errorMessage } from "@/components/field/field-ui";
import { applyFarmPhoto, FarmFormDialog, type FarmPhoto } from "@/components/farms/farm-form-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ImageSlot } from "@/components/ui/image-slot";
import { useToast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/provider";
import { api, type FarmInput } from "@/lib/api";
import { farmImage, siteImages } from "@/lib/site-images";
import type { Farm } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

export default function FarmsPage() {
  const { t, tx, number } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Farm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canCreate = user?.role !== "AGRONOMIST";
  const farmsQuery = useQuery({
    queryKey: ["farms"],
    queryFn: async () => (await api.listFarms()).farms,
  });

  const refresh = async (farmId?: number) => {
    await queryClient.invalidateQueries({ queryKey: ["farms"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    if (farmId) await queryClient.invalidateQueries({ queryKey: ["farm", farmId] });
  };
  const createMutation = useMutation({
    mutationFn: async ({ values, photo }: { values: FarmInput & { name: string }; photo: FarmPhoto }) => {
      const { farm } = await api.createFarm(values);
      return { farm, photoSaved: await applyFarmPhoto(farm.id, photo) };
    },
    onSuccess: async ({ farm, photoSaved }) => {
      toast({ title: t("farms.farmCreated", { name: farm.name }), tone: "success" });
      if (!photoSaved) toast({ title: t("farms.photoFailed"), tone: "warning" });
      setShowForm(false);
      await refresh();
    },
  });
  const updateMutation = useMutation({
    mutationFn: async ({ farmId, values, photo }: { farmId: number; values: FarmInput; photo: FarmPhoto }) => {
      const { farm } = await api.updateFarm(farmId, values);
      return { farm, photoSaved: await applyFarmPhoto(farm.id, photo) };
    },
    onSuccess: async ({ farm, photoSaved }) => {
      toast({ title: t("farms.farmUpdated", { name: farm.name }), tone: "success" });
      if (!photoSaved) toast({ title: t("farms.photoFailed"), tone: "warning" });
      setEditingFarm(null);
      setShowForm(false);
      await refresh(farm.id);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (farm: Farm) => {
      await api.deleteFarm(farm.id);
      return farm;
    },
    onSuccess: async (farm) => {
      toast({ title: t("farms.farmDeleted", { name: farm.name }), tone: "success" });
      await refresh();
    },
    onError: (requestError) => setError(clientErrorMessage(requestError, t("farms.deleteRetry"))),
  });
  const farms = farmsQuery.data ?? [];

  const openCreate = () => {
    setError(null);
    setEditingFarm(null);
    setShowForm(true);
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("common.farm")}
        title={t("farms.title")}
        description={canCreate ? t("farms.description") : t("farms.descriptionAdvisor")}
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("farms.addFarm")}
            </Button>
          ) : undefined
        }
      />
      {error ? (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      ) : null}
      {farmsQuery.isError ? (
        <Alert variant="destructive" className="mb-6">
          {errorMessage(farmsQuery.error, t("farms.loadError"))}
        </Alert>
      ) : null}

      {farmsQuery.isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : farms.length === 0 && !farmsQuery.isError ? (
        <Card className="overflow-hidden">
          <div className="grid items-center md:grid-cols-2">
            <ImageSlot
              image={siteImages.emptyFarm}
              tone="light"
              sizes="(min-width: 768px) 50vw, 100vw"
              className="aspect-[4/3] md:aspect-auto md:h-full md:min-h-80"
            />
            <div className="p-8 md:p-10">
              <h2 className="font-display text-2xl font-bold text-ink">{t("farms.emptyTitle")}</h2>
              <p className="mt-2 text-slate-500">{canCreate ? t("farms.emptyBody") : t("farms.emptyAdvisor")}</p>
              {canCreate ? (
                <Button className="mt-6" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {t("farms.createFirst")}
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {farms.map((farm, index) => {
            const isAdvisor = farm.access === "advisor";
            return (
              <Card
                key={farm.id}
                className="group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <Link href={`/farms/${farm.id}`} className="block" tabIndex={-1} aria-hidden="true">
                  <ImageSlot
                    image={farmImage(farm)}
                    unoptimized={farmImage(farm).uploaded}
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    eager={index < 3}
                    className="h-40"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent transition-opacity group-hover:opacity-80" />
                    <div className="absolute top-3 left-3">
                      <Badge variant={isAdvisor ? "navy" : "default"} className="shadow-soft">
                        {isAdvisor ? <Eye className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
                        {tx(`farms.access_${farm.access ?? "owner"}`)}
                      </Badge>
                    </div>
                    <p className="absolute right-4 bottom-3 left-4 flex items-center gap-1.5 truncate text-sm font-medium text-white/90">
                      <MapPin className="h-4 w-4 shrink-0 text-sun-400" />
                      <span className="truncate">{farm.location || t("farms.locationNotSet")}</span>
                    </p>
                  </ImageSlot>
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-display text-lg font-semibold text-ink">
                    <Link href={`/farms/${farm.id}`} className="transition-colors hover:text-navy-700">
                      {farm.name}
                    </Link>
                  </h2>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{farm.description || t("farms.noDescription")}</p>
                  <div className="mt-4 mb-5 flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      <Sprout className="h-3 w-3" />
                      {farm.fieldCount === 1 ? t("farms.fieldCountOne") : t("farms.fieldCount", { count: number(farm.fieldCount ?? 0) })}
                    </Badge>
                    <Badge variant="secondary">
                      <Ruler className="h-3 w-3" />
                      {t("farms.acresValue", { value: number(farm.totalArea ?? 0, 1) })}
                    </Badge>
                    <Badge variant="info">
                      <Droplets className="h-3 w-3" />
                      {tx(`farms.method_${farm.irrigationMethod}`)}
                    </Badge>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <Link
                      href={`/farms/${farm.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 transition-colors hover:text-navy-900"
                    >
                      {t("farms.viewFields")}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    {!isAdvisor ? (
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("farms.editFarmLabel", { name: farm.name })}
                          title={t("common.edit")}
                          onClick={() => {
                            setError(null);
                            setEditingFarm(farm);
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("farms.deleteFarmLabel", { name: farm.name })}
                          title={t("common.delete")}
                          disabled={deleteMutation.isPending}
                          onClick={() => setPendingDelete(farm)}
                        >
                          <Trash className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showForm ? (
        <FarmFormDialog
          initial={editingFarm ?? undefined}
          onCancel={() => {
            setShowForm(false);
            setEditingFarm(null);
          }}
          onSubmit={async (values, photo) => {
            if (editingFarm) await updateMutation.mutateAsync({ farmId: editingFarm.id, values, photo });
            else await createMutation.mutateAsync({ values, photo });
          }}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={t("farms.deleteFarmTitle", { name: pendingDelete.name })}
          description={t("farms.deleteFarmBody")}
          confirmLabel={t("common.delete")}
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            setError(null);
            await deleteMutation.mutateAsync(pendingDelete).catch(() => undefined);
            setPendingDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}
