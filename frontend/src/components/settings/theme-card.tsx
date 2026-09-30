"use client";

import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { Segmented } from "@/components/field/ops/shared";
import { setTheme, useTheme, type Theme } from "@/components/theme/theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { SectionIcon } from "./section-icon";

export function ThemeCard() {
  const { t } = useI18n();
  const { theme } = useTheme();

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3">
        <SectionIcon icon={Palette} />
        <div className="min-w-0">
          <CardTitle>{t("settings.themeTitle")}</CardTitle>
          <CardDescription>{t("settings.themeBody")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Segmented<Theme>
          label={t("settings.themeTitle")}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: t("common.themeLight"), icon: Sun },
            { value: "dark", label: t("common.themeDark"), icon: Moon },
            { value: "system", label: t("common.themeSystem"), icon: Monitor },
          ]}
        />
      </CardContent>
    </Card>
  );
}
