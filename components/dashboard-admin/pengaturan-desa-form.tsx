"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, ExternalLink, Shield, FileText, Lock, Download, Mail, MessageCircle } from "lucide-react";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
import { toast } from "sonner";
import { useAdmin } from "./admin-context";
import { getAuthClient } from "@/lib/firebase/client";
import { VillageMap } from "./village-map";

export function PengaturanDesaForm() {
  const { profile, refreshProfile } = useAdmin();
  const [saving, setSaving] = useState(false);

  const [kecamatan, setKecamatan] = useState("");
  const [kabupaten, setKabupaten] = useState("");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifWa, setNotifWa] = useState(true);
  const [catatan, setCatatan] = useState("");
  const [enable2FA, setEnable2FA] = useState(false);
  const [enableBackupCodes, setEnableBackupCodes] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [updatingSecurity, setUpdatingSecurity] = useState(false);

  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docVerifying, setDocVerifying] = useState(false);
  const [docSendingOtp, setDocSendingOtp] = useState(false);
  const [docOtpChannel, setDocOtpChannel] = useState<"email" | "phone" | null>(null);
  const [docOtpSent, setDocOtpSent] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [docUrl, setDocUrl] = useState("");

  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [regenChannel, setRegenChannel] = useState<"email" | "phone" | null>(null);
  const [regenStep, setRegenStep] = useState<"select-channel" | "verify-otp" | "show-codes">("select-channel");
  const [regenOtp, setRegenOtp] = useState("");
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [regenLoading, setRegenLoading] = useState(false);

  function maskEmail(email: string) {
    const [local, domain] = email.split("@");
    return local.slice(0, 2) + "***@" + domain;
  }
  function maskPhone(phone: string) {
    return phone.slice(0, 4) + "****" + phone.slice(-3);
  }

  useEffect(() => {
    if (!profile) return;
    setKecamatan(profile.settings.kecamatan || "");
    setKabupaten(profile.settings.kabupaten || "");
    setNotifEmail(profile.settings.notifEmail ?? true);
    setNotifWa(profile.settings.notifWa ?? true);
    setCatatan(profile.settings.catatan || "");
    setEnable2FA(profile.security.enable2FA ?? false);
    setEnableBackupCodes(profile.security.enableBackupCodes ?? false);

    // Auto-fill kecamatan & kabupaten jika belum terisi
    if (!profile.settings.kecamatan && !profile.settings.kabupaten) {
      const lat = parseFloat(profile.latitude || "");
      const lng = parseFloat(profile.longitude || "");
      if (!isNaN(lat) && !isNaN(lng)) {
        setGeocoding(true);
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=id`,
          { headers: { "Accept-Language": "id" } }
        )
          .then((r) => r.json())
          .then((d) => {
            const addr = d.address || {};
            setKecamatan(addr.suburb || addr.village || addr.town || addr.county || "");
            setKabupaten(addr.city || addr.regency || addr.county || addr.state || "");
          })
          .catch(() => {})
          .finally(() => setGeocoding(false));
      }
    }
  }, [profile]);

  const mapCenter = useMemo(() => {
    const lat = parseFloat(profile?.latitude || "");
    const lng = parseFloat(profile?.longitude || "");
    if (isNaN(lat) || isNaN(lng)) return { lat: -6.2, lng: 106.8 };
    return { lat, lng };
  }, [profile]);

  async function handleUpdateSecurity(key: "enable2FA" | "enableBackupCodes", value: boolean) {
    // Update local state first for responsiveness
    if (key === "enable2FA") setEnable2FA(value);
    else setEnableBackupCodes(value);

    setUpdatingSecurity(true);
    try {
      const idToken = await getAuthClient().currentUser?.getIdToken();
      if (!idToken) throw new Error("Sesi habis");

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      await refreshProfile();
      toast.success(`${key === "enable2FA" ? "2FA" : "Kode Backup"} berhasil ${value ? "diaktifkan" : "dimatikan"}`);
    } catch (err) {
      // Revert local state on error
      if (key === "enable2FA") setEnable2FA(!value);
      else setEnableBackupCodes(!value);
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui keamanan");
    } finally {
      setUpdatingSecurity(false);
    }
  }

  async function handleSimpan() {
    setSaving(true);
    try {
      const idToken = await getAuthClient().currentUser?.getIdToken();
      if (!idToken) throw new Error("Sesi habis, login ulang");

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ kecamatan, kabupaten, notifEmail, notifWa, catatan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshProfile();
      toast.success("Pengaturan desa disimpan ke Firebase");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function sendDocOtp(channel: "email" | "phone") {
    setDocSendingOtp(true);
    try {
      const idToken = await getAuthClient().currentUser?.getIdToken();
      if (!idToken) throw new Error("Sesi habis");
      const res = await fetch("/api/admin/security/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: "send-otp", channel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocOtpChannel(channel);
      setDocOtpSent(true);
      toast.success(`OTP dikirim ke ${channel === "email" ? "email" : "WhatsApp"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal kirim OTP");
    } finally {
      setDocSendingOtp(false);
    }
  }

  async function unlockDocument() {
    setDocVerifying(true);
    try {
      const idToken = await getAuthClient().currentUser?.getIdToken();
      if (!idToken) throw new Error("Sesi habis");

      const body: any = {};
      if (profile?.security.enable2FA) {
        body.totpCode = totpCode || undefined;
      }
      if (profile?.security.enableBackupCodes) {
        body.backupCode = backupCode || undefined;
      }
      if (!profile?.security.enable2FA && !profile?.security.enableBackupCodes) {
        if (docOtpChannel === "email") {
          body.emailOtp = emailOtp || undefined;
        } else {
          body.phoneOtp = phoneOtp || undefined;
        }
      }

      const res = await fetch("/api/admin/security/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const docRes = await fetch(
        `/api/admin/documents/approval?accessToken=${data.accessToken}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      if (!docRes.ok) {
        const err = await docRes.json().catch(() => ({}));
        throw new Error(err.error || "Gagal memuat dokumen");
      }
      const blob = await docRes.blob();
      setDocUrl(URL.createObjectURL(blob));
      setDocDialogOpen(false);
      toast.success("Dokumen terbuka — sesi 15 menit");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verifikasi gagal");
    } finally {
      setDocVerifying(false);
    }
  }

  async function handleSendRegenOtp() {
    if (!regenChannel) return;
    setRegenLoading(true);
    try {
      const idToken = await getAuthClient().currentUser?.getIdToken();
      if (!idToken) throw new Error("Sesi habis");
      const res = await fetch("/api/admin/backup-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: "send-otp", channel: regenChannel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRegenStep("verify-otp");
      toast.success(`OTP regenerasi dikirim ke ${regenChannel === "email" ? "email" : "WhatsApp"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal kirim OTP");
    } finally {
      setRegenLoading(false);
    }
  }

  async function handleVerifyAndGenerate() {
    if (!regenChannel || !regenOtp) return;
    setRegenLoading(true);
    try {
      const idToken = await getAuthClient().currentUser?.getIdToken();
      if (!idToken) throw new Error("Sesi habis");
      const res = await fetch("/api/admin/backup-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: "generate", channel: regenChannel, otpCode: regenOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewBackupCodes(data.codes);
      setRegenStep("show-codes");
      setEnableBackupCodes(true);
      await refreshProfile();
      toast.success("Kode cadangan baru berhasil dibuat!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verifikasi gagal");
    } finally {
      setRegenLoading(false);
    }
  }

  function downloadBackupCodes() {
    const content = `LAPOR.AH - KODE CADANGAN 2FA\nDesa: ${profile?.villageName}\nAdmin: ${profile?.name}\nTanggal: ${new Date().toLocaleString()}\n\n${newBackupCodes.join("\n")}\n\nSIMPAN DI TEMPAT AMAN. JANGAN BAGIKAN KODE INI.`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-codes-${profile?.villageName?.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File kode cadangan berhasil diunduh");
  }

  if (!profile) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`;

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="border border-foreground/10 rounded-lg p-6 space-y-4">
        <p className="text-xs font-mono text-muted-foreground">Profil terdaftar</p>
        {/* Profile and cover images are now managed and displayed exclusively on the profile page */}
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Nama:</span> {profile.name}</div>
          <div><span className="text-muted-foreground">Jabatan:</span> {profile.position || "—"}</div>
          <div><span className="text-muted-foreground">NIK:</span> <span className="font-mono">{profile.nik}</span></div>
          <div><span className="text-muted-foreground">Email:</span> {profile.email}</div>
          <div><span className="text-muted-foreground">Telepon:</span> {profile.phone}</div>
          <div><span className="text-muted-foreground">Desa:</span> {profile.villageName}</div>
        </div>
      </div>

      <div className="border border-foreground/10 rounded-lg p-6 space-y-4">
        <p className="text-xs font-mono text-muted-foreground">Lokasi desa terdaftar</p>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono">{profile.latitude}, {profile.longitude}</span>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5 text-xs">
            Google Maps <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="relative z-0">
          <VillageMap
            center={mapCenter}
            points={[
              {
                lat: mapCenter.lat,
                lng: mapCenter.lng,
                label: `Desa ${profile.villageName}`,
                detail: "Koordinat saat pendaftaran — dipakai sebagai pusat wilayah desa",
                type: "village",
              },
            ]}
            height={240}
          />
        </div>
      </div>

      <div className="border border-foreground/10 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <p className="text-xs font-mono text-muted-foreground">Keamanan akun</p>
          {updatingSecurity && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="flex items-center justify-between border rounded-lg px-4 py-3">
            <span>2FA (Authenticator)</span>
            <Switch 
              checked={enable2FA} 
              onCheckedChange={(v) => handleUpdateSecurity("enable2FA", v)} 
              disabled={updatingSecurity}
            />
          </div>
          <div className="flex items-center justify-between border rounded-lg px-4 py-3">
            <div>
              <span>Kode cadangan</span>
              <p className="text-[10px] text-muted-foreground">Tersisa {profile.security.backupCodesRemaining} kode</p>
            </div>
            <Switch 
              checked={enableBackupCodes} 
              onCheckedChange={(v) => handleUpdateSecurity("enableBackupCodes", v)} 
              disabled={updatingSecurity}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-foreground/10">
          <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
            <div>
              <p className="font-medium">Regenerasi Kode Cadangan</p>
              <p className="text-[11px] text-muted-foreground">Buat ulang 10 kode cadangan baru dengan verifikasi OTP.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setRegenDialogOpen(true); setRegenStep("select-channel"); }}>
              Regenerasi Kode
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Login dan akses dokumen pengesahan memerlukan 2FA (jika aktif) atau Kode Cadangan (jika aktif). Jika keduanya mati, verifikasi OTP email atau WhatsApp wajib dilakukan.
        </p>
      </div>

      {profile.security.hasApprovalDocument && (
        <div className="border border-foreground/10 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <p className="text-xs font-mono text-muted-foreground">Dokumen pengesahan desa</p>
            {profile.security.documentVerified && (
              <Badge variant="outline" className="text-green-600">Terverifikasi</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Dokumen hanya dapat dibuka setelah verifikasi keamanan (2FA atau OTP).
          </p>
          {docUrl ? (
            <div className="space-y-2">
              <iframe src={docUrl} className="w-full h-96 border rounded-lg" title="Dokumen pengesahan" />
              <p className="text-xs text-muted-foreground">Sesi akses dokumen berlaku 15 menit.</p>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setDocDialogOpen(true)}>
              <Lock className="w-4 h-4 mr-2" />
              Buka dokumen (verifikasi wajib)
            </Button>
          )}
        </div>
      )}

      <div className="border border-foreground/10 rounded-lg p-6 space-y-4">
        <p className="text-xs font-mono text-muted-foreground">Identitas desa</p>
        <div className="space-y-2">
          <Label htmlFor="namaDesa">Nama desa</Label>
          <Input id="namaDesa" value={profile.villageName} readOnly className="border-foreground/10 bg-muted/30" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kecamatan" className="flex items-center gap-1">
              Kecamatan
              {geocoding && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </Label>
            <Input id="kecamatan" value={kecamatan} onChange={(e) => setKecamatan(e.target.value)} className="border-foreground/10" placeholder="Otomatis dari koordinat..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kabupaten" className="flex items-center gap-1">
              Kabupaten
              {geocoding && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </Label>
            <Input id="kabupaten" value={kabupaten} onChange={(e) => setKabupaten(e.target.value)} className="border-foreground/10" placeholder="Otomatis dari koordinat..." />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="kepalaDesa">Kepala desa</Label>
          <Input id="kepalaDesa" value={profile.name} readOnly className="border-foreground/10 bg-muted/30" />
        </div>
      </div>

      <div className="border border-foreground/10 rounded-lg p-6 space-y-4">
        <p className="text-xs font-mono text-muted-foreground">Kontak & notifikasi</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emailDesa">Email kantor desa</Label>
            <Input id="emailDesa" type="email" value={profile.email} readOnly className="border-foreground/10 bg-muted/30" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teleponDesa">Telepon kantor desa</Label>
            <Input id="teleponDesa" value={profile.phone} readOnly className="border-foreground/10 bg-muted/30" />
          </div>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Notifikasi email</p>
            <p className="text-xs text-muted-foreground">Kirim email saat ada laporan baru</p>
          </div>
          <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Notifikasi WhatsApp</p>
            <p className="text-xs text-muted-foreground">Kirim WA ke petugas terkait</p>
          </div>
          <Switch checked={notifWa} onCheckedChange={setNotifWa} />
        </div>
      </div>


      <Button onClick={handleSimpan} disabled={saving} className="mt-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Simpan pengaturan
      </Button>

      <Dialog open={docDialogOpen} onOpenChange={(open) => {
        setDocDialogOpen(open);
        if (!open) {
          setDocOtpSent(false);
          setDocOtpChannel(null);
          setEmailOtp("");
          setPhoneOtp("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi akses dokumen</DialogTitle>
            <DialogDescription>
              {(profile.security.enable2FA || profile.security.enableBackupCodes)
                ? "Masukkan kode authenticator 2FA atau kode cadangan Anda."
                : "Pilih metode pengiriman kode OTP untuk membuka dokumen."}
            </DialogDescription>
          </DialogHeader>
          
          {(profile.security.enable2FA || profile.security.enableBackupCodes) ? (
            <div className="space-y-3">
              {profile.security.enable2FA && (
                <div className="space-y-1">
                  <Label htmlFor="totpCode">Kode Authenticator</Label>
                  <Input id="totpCode" placeholder="Kode authenticator (6 digit)" value={totpCode} onChange={(e) => { setDocOtpChannel(null); setTotpCode(e.target.value); }} />
                </div>
              )}
              {profile.security.enableBackupCodes && (
                <div className="space-y-1">
                  <Label htmlFor="backupCode">Kode Cadangan</Label>
                  <Input id="backupCode" placeholder="Atau masukkan kode cadangan" value={backupCode} onChange={(e) => setBackupCode(e.target.value)} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {!docOtpSent ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Kirim OTP ke:</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => sendDocOtp("email")} disabled={docSendingOtp} className="w-1/2 gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => sendDocOtp("phone")} disabled={docSendingOtp} className="w-1/2 gap-1.5">
                      <WhatsAppIcon />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {docOtpChannel === "email" ? (
                    <div className="space-y-1">
                      <Label htmlFor="emailOtp">OTP Email</Label>
                      <Input id="emailOtp" placeholder="Masukkan OTP Email" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor="phoneOtp">OTP WhatsApp</Label>
                      <Input id="phoneOtp" placeholder="Masukkan OTP WhatsApp" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} />
                    </div>
                  )}
                  <Button variant="link" size="sm" onClick={() => setDocOtpSent(false)} className="px-0 text-[10px] h-auto">
                    Kirim ulang / Ganti metode
                  </Button>
                </div>
              )}
            </div>
          )}
          <Button onClick={unlockDocument} disabled={docVerifying || (!(profile.security.enable2FA || profile.security.enableBackupCodes) && !docOtpSent)} className="w-full">
            {docVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buka dokumen"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Dialog Regenerasi Kode Cadangan */}
      <Dialog open={regenDialogOpen} onOpenChange={(open) => {
        setRegenDialogOpen(open);
        if (!open) {
          setRegenStep("select-channel");
          setRegenOtp("");
          setNewBackupCodes([]);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerasi Kode Cadangan</DialogTitle>
            <DialogDescription>
              Buat 10 kode cadangan baru untuk akun Anda.
            </DialogDescription>
          </DialogHeader>

          {regenStep === "select-channel" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">Pilih metode pengiriman kode OTP untuk verifikasi:</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={regenChannel === "email" ? "default" : "outline"}
                  onClick={() => setRegenChannel("email")}
                  className="h-16 flex flex-col gap-1 rounded-xl"
                  type="button"
                >
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">Email</span>
                  </div>
                  <span className="text-[10px] opacity-70">{profile.email ? maskEmail(profile.email) : ""}</span>
                </Button>
                <Button
                  variant={regenChannel === "phone" ? "default" : "outline"}
                  onClick={() => setRegenChannel("phone")}
                  className="h-16 flex flex-col gap-1 rounded-xl"
                  type="button"
                >
                  <div className="flex items-center gap-1.5">
                    <WhatsAppIcon />
                    <span className="text-sm">WhatsApp</span>
                  </div>
                  <span className="text-[10px] opacity-70">{profile.phone ? maskPhone(profile.phone) : ""}</span>
                </Button>
              </div>
              <Button onClick={handleSendRegenOtp} disabled={regenLoading || !regenChannel} className="w-full h-11 rounded-full">
                {regenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim Kode OTP"}
              </Button>
            </div>
          )}

          {regenStep === "verify-otp" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Kode OTP telah dikirim ke {regenChannel === "email" ? "Email" : "WhatsApp"} Anda. Masukkan kode tersebut di bawah ini:
              </p>
              <Input
                placeholder="Masukkan 6 digit kode OTP"
                value={regenOtp}
                onChange={(e) => setRegenOtp(e.target.value)}
                maxLength={6}
                className="text-center font-mono text-lg tracking-widest h-11"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setRegenStep("select-channel")} className="w-1/2">
                  Kembali
                </Button>
                <Button onClick={handleVerifyAndGenerate} disabled={regenLoading || regenOtp.length < 4} className="w-1/2">
                  {regenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verifikasi & Generate"}
                </Button>
              </div>
            </div>
          )}

          {regenStep === "show-codes" && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-600 dark:text-yellow-500 text-xs space-y-1">
                <p className="font-bold">⚠️ PENTING: SIMPAN KODE INI DENGAN AMAN!</p>
                <p>Kode ini hanya ditampilkan sekali. Tulis atau salin kode-kode di bawah ini sebelum menutup dialog.</p>
              </div>
              <div className="bg-muted p-4 rounded-lg font-mono grid grid-cols-2 gap-2 border">
                {newBackupCodes.map((code, idx) => (
                  <div key={idx} className="flex justify-between items-center px-3 py-1.5 bg-background rounded border border-foreground/5 text-sm">
                    <span>{code}</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">Kode {idx + 1}</Badge>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(newBackupCodes.join("\n"));
                    toast.success("Kode cadangan berhasil disalin ke clipboard!");
                  }}
                  className="flex-1"
                  variant="outline"
                >
                  Salin Semua Kode
                </Button>
                <Button
                  onClick={downloadBackupCodes}
                  className="flex-1"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" /> Unduh (.txt)
                </Button>
              </div>
              <Button onClick={() => setRegenDialogOpen(false)} className="w-full">
                Selesai & Tutup
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
