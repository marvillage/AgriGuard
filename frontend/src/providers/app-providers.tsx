"use client";

import { I18nProvider } from "@/i18n/provider";
import { ToastProvider } from "@/components/ui/toaster";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { AuthProvider, useAuth } from "./auth-provider";
import { LiveProvider } from "./live-provider";
import { QueryProvider } from "./query-provider";

function WithLanguage({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <I18nProvider userLanguage={user?.language}>{children}</I18nProvider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <WithLanguage>
          <ToastProvider>
            <LiveProvider>
              <RegisterServiceWorker />
              {children}
            </LiveProvider>
          </ToastProvider>
        </WithLanguage>
      </AuthProvider>
    </QueryProvider>
  );
}
