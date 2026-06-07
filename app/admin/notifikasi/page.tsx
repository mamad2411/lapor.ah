"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/dashboard-admin/admin-layout";
import { SectionHeading } from "@/components/dashboard-admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, FileText, MessageSquare, MessagesSquare } from "lucide-react";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  laporan: <FileText className="w-4 h-4" />,
  diskusi: <MessagesSquare className="w-4 h-4" />,
  pesan: <MessageSquare className="w-4 h-4" />,
};

export default function AdminNotifikasiPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = () => {
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications || []));
  };

  useEffect(() => { load(); }, []);

  async function markRead(id: string) {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <SectionHeading
          label="Notifikasi"
          title="Pemberitahuan Real-time"
          description={
            unread > 0
              ? `${unread} notifikasi membutuhkan perhatian — laporan, diskusi, dan pesan warga.`
              : "Semua notifikasi sudah dibaca."
          }
        />
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 flex flex-col items-center gap-2">
              <Bell className="w-8 h-8 opacity-30" />
              Belum ada notifikasi
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-xl border p-4 ${!n.read ? "border-primary/30 bg-primary/5" : ""}`}
              >
                <div className="mt-0.5 text-muted-foreground">{TYPE_ICON[n.type] || <Bell className="w-4 h-4" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{n.title}</p>
                    <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                    {!n.read && <Badge className="text-[10px] bg-primary/20 text-primary border-0">Baru</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(n.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
                {!n.read && (
                  <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                    Tandai dibaca
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
