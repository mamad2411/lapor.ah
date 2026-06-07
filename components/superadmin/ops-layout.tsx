"use client";

import { OpsHeader } from "./ops-header";
import { OpsSidebar } from "./ops-sidebar";

export function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background noise-overlay">
      <div className="flex min-h-screen">
        <div className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-40">
          <OpsSidebar />
        </div>
        <div className="flex flex-1 flex-col lg:pl-64">
          <OpsHeader />
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
