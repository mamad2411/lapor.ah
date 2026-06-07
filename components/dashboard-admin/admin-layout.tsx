"use client";

import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";
import { useAdmin } from "./admin-context";
import { AlertCircle } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}

export function AdminLayout({
  children,
  searchQuery,
  onSearchChange,
  showSearch,
}: AdminLayoutProps) {
  const { profile } = useAdmin();

  return (
    <div className="min-h-screen bg-background noise-overlay">
      <div className="flex min-h-screen">
        <div className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-40">
          <AdminSidebar />
        </div>

        <div className="flex flex-1 flex-col lg:pl-64">
          <AdminHeader
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            showSearch={showSearch}
          />
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            {profile?.deletionPendingAt && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex gap-3 items-start animate-in fade-in slide-in-from-top-4 duration-500">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Peringatan: Akun Dijadwalkan untuk Dihapus</p>
                  <p className="text-xs opacity-80 leading-relaxed">
                    Akun admin desa ini telah ditandai untuk dihapus oleh Super Admin ({profile.deletionScheduledBy}). 
                    Semua data akan dihapus secara permanen dalam beberapa hari ke depan. 
                    Hubungi tim pusat jika ini adalah kesalahan.
                  </p>
                </div>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
