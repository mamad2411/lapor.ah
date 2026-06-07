"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Loader2, Shield, ArrowLeft, Mail, Ban, FileText } from "lucide-react";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#25D366]">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

type BannedInfo = {
  bannedAt: string;
  bannedUntil: string;
  reason: string;
  proofUrl?: string;
  bannedBy: string;
};

function BanCountdown({ bannedUntil, onExpire }: { bannedUntil: string; onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    function calculateTime() {
      const difference = +new Date(bannedUntil) - +new Date();
      if (difference <= 0) {
        setTimeLeft(null);
        if (onExpire) onExpire();
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    }

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [bannedUntil, onExpire]);

  if (!timeLeft) {
    return <span className="font-semibold text-emerald-600 text-xs md:text-sm">Masa penangguhan telah berakhir. Silakan coba masuk kembali.</span>;
  }

  return (
    <div className="grid grid-cols-4 gap-2 text-center mt-3">
      <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-2">
        <span className="block text-xl font-bold text-destructive">{timeLeft.days}</span>
        <span className="text-[10px] text-muted-foreground uppercase font-bold">Hari</span>
      </div>
      <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-2">
        <span className="block text-xl font-bold text-destructive">{timeLeft.hours}</span>
        <span className="text-[10px] text-muted-foreground uppercase font-bold">Jam</span>
      </div>
      <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-2">
        <span className="block text-xl font-bold text-destructive">{timeLeft.minutes}</span>
        <span className="text-[10px] text-muted-foreground uppercase font-bold">Menit</span>
      </div>
      <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-2">
        <span className="block text-xl font-bold text-destructive">{timeLeft.seconds}</span>
        <span className="text-[10px] text-muted-foreground uppercase font-bold">Detik</span>
      </div>
    </div>
  );
}

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthClient } from "@/lib/firebase/client";
import { buildAdminPanelPath } from "@/lib/admin/build-admin-url";

function mapFirebaseAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email atau kata sandi salah.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Coba lagi nanti.";
    case "auth/user-disabled":
      return "Akun dinonaktifkan. Hubungi superadmin.";
    default:
      return "Gagal masuk. Periksa kredensial Anda.";
  }
}

function translateError(err: unknown, defaultMsg: string): string {
  if (!err) return defaultMsg;
  const message = err instanceof Error ? err.message : String(err);
  
  if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password") || message.includes("auth/user-not-found")) {
    return "Email atau kata sandi salah. Silakan periksa kembali.";
  }
  if (message.includes("auth/too-many-requests")) {
    return "Terlalu banyak percobaan masuk yang gagal. Silakan coba beberapa saat lagi.";
  }
  if (message.includes("auth/user-disabled")) {
    return "Akun Anda telah dinonaktifkan oleh superadmin.";
  }
  if (message.includes("Failed to fetch")) {
    return "Gagal terhubung ke server. Silakan periksa koneksi internet Anda.";
  }
  if (message.includes("Firebase:")) {
    return "Terjadi kendala autentikasi. Silakan periksa kembali email dan kata sandi Anda.";
  }
  
  return message;
}

function buildAdminPath(userData: {
  uid: string;
  villageName?: string;
  latitude?: string;
  longitude?: string;
  adminToken?: string;
  adminUrl?: string;
}) {
  if (userData.adminUrl) {
    if (userData.adminUrl.startsWith("/")) return userData.adminUrl;
    if (userData.adminUrl.includes("/admin")) {
      try {
        const u = new URL(userData.adminUrl);
        return `${u.pathname}${u.search}`;
      } catch { /* ignore */ }
    }
  }
  if (userData.adminToken) {
    return buildAdminPanelPath({
      uid: userData.uid,
      villageName: userData.villageName || "",
      latitude: userData.latitude || "",
      longitude: userData.longitude || "",
      adminToken: userData.adminToken,
    });
  }
  return "/masuk";
}

// Step order tergantung metode yang aktif
// Jika 2FA aktif: credentials → 2fa → (opsional backup)
// Jika tidak: credentials → email-otp → wa-otp
type Step = "credentials" | "choose-otp" | "email-otp" | "wa-otp" | "2fa" | "backup";

const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 30;

type PendingUser = {
  uid: string;
  email: string;
  villageName?: string;
  latitude?: string;
  longitude?: string;
  adminToken?: string;
  adminUrl?: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";

  const [step, setStep] = useState<Step>("credentials");
  const [requires2FA, setRequires2FA] = useState(false);
  const [has2FA, setHas2FA] = useState(false);
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);
  const [idToken, setIdToken] = useState("");
  const [bannedInfo, setBannedInfo] = useState<BannedInfo | null>(null);
  const [showBannedModal, setShowBannedModal] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");

  const [identifier, setIdentifier] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  function maskEmail(email: string) {
    const [local, domain] = email.split("@");
    return local.slice(0, 2) + "***@" + domain;
  }
  function maskPhone(phone: string) {
    return phone.slice(0, 4) + "****" + phone.slice(-3);
  }

  function isBlocked() {
    if (!blockedUntil) return false;
    if (Date.now() < blockedUntil) return true;
    setBlockedUntil(null);
    setAttempts(0);
    return false;
  }

  function blockMinutesLeft() {
    if (!blockedUntil) return 0;
    return Math.ceil((blockedUntil - Date.now()) / 60000);
  }

  function handleFailedAttempt(msg: string) {
    const next = attempts + 1;
    setAttempts(next);
    if (next >= MAX_ATTEMPTS) {
      setBlockedUntil(Date.now() + BLOCK_MINUTES * 60 * 1000);
      setError(`Terlalu banyak percobaan gagal. Akses diblokir selama ${BLOCK_MINUTES} menit.`);
    } else {
      setError(`${msg} (${next}/${MAX_ATTEMPTS} percobaan)`);
    }
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (isBlocked()) return;
    setError("");
    setLoading(true);
    try {
      const resolveRes = await fetch("/api/auth/resolve-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const userData = await resolveRes.json();
      if (!resolveRes.ok) {
        if (userData.error === "banned") {
          setBannedInfo(userData.banInfo);
          setShowBannedModal(true);
          return;
        }
        throw new Error(userData.error || "Akun tidak ditemukan.");
      }

      const cred = await signInWithEmailAndPassword(getAuthClient(), userData.email, password);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      setPendingUser(userData);
      setAttempts(0);

      const otpRes = await fetch("/api/auth/login-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok) {
        if (otpData.error === "banned") {
          setBannedInfo(otpData.banInfo);
          setShowBannedModal(true);
          return;
        }
        throw new Error(otpData.error);
      }

      setRequires2FA(otpData.requires2FA);
      setHas2FA(Boolean(otpData.enable2FA));
      if (otpData.requires2FA) {
        if (otpData.enable2FA) {
          setStep("2fa");
        } else {
          setStep("backup");
        }
      } else {
        setMaskedEmail(maskEmail(otpData.email || userData.email));
        setMaskedPhone(maskPhone(otpData.phone || userData.phone || ""));
        setStep("choose-otp");
      }
    } catch (err: unknown) {
      const fbCode = (err as { code?: string })?.code;
      if (fbCode?.startsWith("auth/")) {
        handleFailedAttempt(mapFirebaseAuthError(fbCode));
      } else {
        handleFailedAttempt(translateError(err, "Gagal masuk."));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(channel: "email" | "phone") {
    if (!idToken) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, channel }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "banned") {
          setBannedInfo(data.banInfo);
          setShowBannedModal(true);
          return;
        }
        throw new Error(data.error);
      }
      
      setCode("");
      if (channel === "email") {
        setStep("email-otp");
      } else {
        setStep("wa-otp");
      }
    } catch (err) {
      setError(translateError(err, "Gagal mengirim OTP."));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailOtp(e: React.FormEvent) {
    e.preventDefault();
    if (isBlocked() || !idToken) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, purpose: "login", emailOtp: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "banned") {
          setBannedInfo(data.banInfo);
          setShowBannedModal(true);
          return;
        }
        throw new Error(data.error || "Kode email salah");
      }
      await finishLogin();
    } catch (err) {
      handleFailedAttempt(translateError(err, "Kode OTP email salah"));
    } finally {
      setLoading(false);
    }
  }

  async function handleWaOtp(e: React.FormEvent) {
    e.preventDefault();
    if (isBlocked() || !idToken || !pendingUser) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, purpose: "login", phoneOtp: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "banned") {
          setBannedInfo(data.banInfo);
          setShowBannedModal(true);
          return;
        }
        throw new Error(data.error || "Kode WA salah");
      }
      await finishLogin();
    } catch (err) {
      handleFailedAttempt(translateError(err, "Kode OTP WhatsApp salah"));
    } finally {
      setLoading(false);
    }
  }

  async function handle2FA(e: React.FormEvent) {
    e.preventDefault();
    if (isBlocked() || !idToken || !pendingUser) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, purpose: "login", totpCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "banned") {
          setBannedInfo(data.banInfo);
          setShowBannedModal(true);
          return;
        }
        throw new Error(data.error || "Kode authenticator salah");
      }
      setAttempts(0);
      await finishLogin();
    } catch (err) {
      handleFailedAttempt(translateError(err, "Kode 2FA salah"));
    } finally {
      setLoading(false);
    }
  }

  async function handleBackupCode(e: React.FormEvent) {
    e.preventDefault();
    if (isBlocked() || !idToken || !pendingUser) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, purpose: "login", backupCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "banned") {
          setBannedInfo(data.banInfo);
          setShowBannedModal(true);
          return;
        }
        throw new Error(data.error || "Kode cadangan salah");
      }
      setAttempts(0);
      await finishLogin();
    } catch (err) {
      handleFailedAttempt(translateError(err, "Kode cadangan salah"));
    } finally {
      setLoading(false);
    }
  }

  async function finishLogin() {
    if (!pendingUser) return;
    fetch("/api/auth/sync-laravel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }).catch(() => {});
    router.push(buildAdminPath(pendingUser));
  }

  const blocked = isBlocked();

  function renderContent() {
    // ---- STEP: credentials ----
    if (step === "credentials") {
      return (
        <AuthCard
          title="Masuk ke Lapor.ah"
          description="Gunakan email atau nomor telepon + password saat pendaftaran."
          footerContent={
            <p>
              Belum punya akun atau lupa password?{" "}
              <Link href="/auth/permintaan" className="text-foreground underline underline-offset-4">
                Kirim permintaan
              </Link>
            </p>
          }
        >
          <form onSubmit={handleCredentials} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email atau nomor telepon</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="email@contoh.com atau 08123456789"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}
            {blocked && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                Akses diblokir. Coba lagi dalam {blockMinutesLeft()} menit.
              </p>
            )}
            <Button type="submit" className="w-full h-11 rounded-full" disabled={loading || blocked}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lanjut"}
            </Button>
          </form>
        </AuthCard>
      );
    }

    // ---- STEP: choose-otp ----
    if (step === "choose-otp") {
      return (
        <AuthCard
          title="Pilih Metode Verifikasi"
          description="Pilih ke mana kode OTP verifikasi login akan dikirimkan."
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <Shield className="w-4 h-4 shrink-0" />
              Verifikasi Keamanan Akun
            </div>
            
            <div className="space-y-3">
              <button
                type="button"
                className="w-full justify-start px-4 py-3 rounded-xl border flex items-center gap-4 bg-background hover:bg-muted/30 text-foreground transition-colors group"
                disabled={loading}
                onClick={() => handleSendOtp("email")}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Kirim ke Email</p>
                  <p className="text-xs text-muted-foreground">{maskedEmail}</p>
                </div>
              </button>

              <button
                type="button"
                className="w-full justify-start px-4 py-3 rounded-xl border flex items-center gap-4 bg-background hover:bg-muted/30 text-foreground transition-colors group"
                disabled={loading}
                onClick={() => handleSendOtp("phone")}
              >
                <div className="w-10 h-10 rounded-lg bg-[#25D366]/10 flex items-center justify-center text-[#25D366] group-hover:bg-[#25D366] group-hover:text-white transition-colors">
                  <WhatsAppIcon />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Kirim ke WhatsApp</p>
                  <p className="text-xs text-muted-foreground">{maskedPhone}</p>
                </div>
              </button>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}

            <Button type="button" variant="ghost" className="w-full gap-2" onClick={() => { setStep("credentials"); setError(""); }}>
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Button>
          </div>
        </AuthCard>
      );
    }

    // ---- STEP: email-otp ----
    if (step === "email-otp") {
      return (
        <AuthCard
          title="Verifikasi email"
          description={`Kode OTP dikirim ke ${maskedEmail}`}
        >
          <form onSubmit={handleEmailOtp} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <Shield className="w-4 h-4 shrink-0" />
              Verifikasi Email
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailOtp">Kode OTP (6 digit)</Label>
              <Input
                id="emailOtp"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                placeholder="123456"
                autoFocus
                autoComplete="one-time-code"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}
            {blocked && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                Akses diblokir. Coba lagi dalam {blockMinutesLeft()} menit.
              </p>
            )}
            <Button type="submit" className="w-full h-11 rounded-full" disabled={loading || blocked}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk"}
            </Button>
            <Button type="button" variant="ghost" className="w-full gap-2" onClick={() => { setStep("choose-otp"); setCode(""); setError(""); }}>
              <ArrowLeft className="w-4 h-4" /> Kembali ke Pilihan Metode
            </Button>
          </form>
        </AuthCard>
      );
    }

    // ---- STEP: wa-otp ----
    if (step === "wa-otp") {
      return (
        <AuthCard
          title="Verifikasi WhatsApp"
          description={`Kode OTP dikirim ke ${maskedPhone}`}
        >
          <form onSubmit={handleWaOtp} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <Shield className="w-4 h-4 shrink-0" />
              Verifikasi WhatsApp
            </div>
            <div className="space-y-2">
              <Label htmlFor="waOtp">Kode OTP (6 digit)</Label>
              <Input
                id="waOtp"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                placeholder="123456"
                autoFocus
                autoComplete="one-time-code"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}
            {blocked && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                Akses diblokir. Coba lagi dalam {blockMinutesLeft()} menit.
              </p>
            )}
            <Button type="submit" className="w-full h-11 rounded-full" disabled={loading || blocked}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk"}
            </Button>
            <Button type="button" variant="ghost" className="w-full gap-2" onClick={() => { setStep("choose-otp"); setCode(""); setError(""); }}>
              <ArrowLeft className="w-4 h-4" /> Kembali ke Pilihan Metode
            </Button>
          </form>
        </AuthCard>
      );
    }

    // ---- STEP: 2fa ----
    if (step === "2fa") {
      return (
        <AuthCard
          title="Verifikasi 2FA"
          description="Masukkan kode dari aplikasi authenticator (Google Authenticator / Authy)."
        >
          <form onSubmit={handle2FA} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <Shield className="w-4 h-4 shrink-0" />
              Verifikasi Authenticator
            </div>
            <div className="space-y-2">
              <Label htmlFor="totpCode">Kode Authenticator</Label>
              <Input
                id="totpCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}
            {blocked && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                Akses diblokir. Coba lagi dalam {blockMinutesLeft()} menit.
              </p>
            )}
            <Button type="submit" className="w-full h-11 rounded-full" disabled={loading || blocked}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk"}
            </Button>
            <Button type="button" variant="link" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => { setStep("backup"); setCode(""); setError(""); }}>
              Tidak bisa akses authenticator? Pakai kode cadangan
            </Button>
            <Button type="button" variant="ghost" className="w-full gap-2" onClick={() => { setStep("credentials"); setCode(""); setError(""); }}>
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Button>
          </form>
        </AuthCard>
      );
    }

    // ---- STEP: backup ----
    return (
      <AuthCard
        title="Kode cadangan"
        description="Masukkan salah satu kode cadangan yang kamu simpan saat setup 2FA."
      >
        <form onSubmit={handleBackupCode} className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            <Shield className="w-4 h-4 shrink-0" />
            Setiap kode cadangan hanya bisa digunakan sekali.
          </div>
          <div className="space-y-2">
            <Label htmlFor="backupCode">Kode cadangan</Label>
            <Input
              id="backupCode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XXXX-XXXX"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}
          {blocked && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              Akses diblokir. Coba lagi dalam {blockMinutesLeft()} menit.
            </p>
          )}
          <Button type="submit" className="w-full h-11 rounded-full" disabled={loading || blocked}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk"}
          </Button>
          {has2FA ? (
            <Button type="button" variant="ghost" className="w-full gap-2" onClick={() => { setStep("2fa"); setCode(""); setError(""); }}>
              <ArrowLeft className="w-4 h-4" /> Kembali ke authenticator
            </Button>
          ) : (
            <Button type="button" variant="ghost" className="w-full gap-2" onClick={() => { setStep("credentials"); setCode(""); setError(""); }}>
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Button>
          )}
        </form>
      </AuthCard>
    );
  }

  return (
    <>
      {renderContent()}
      
      {showBannedModal && bannedInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-destructive">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <Ban className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Akun Ditangguhkan</h3>
                  <p className="text-xs text-muted-foreground">Akses Anda dibatasi sementara</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-muted-foreground text-xs md:text-sm">Alasan Banned:</p>
                  <p className="text-foreground bg-muted/40 p-3 rounded-xl border font-medium text-xs md:text-sm">
                    {bannedInfo.reason}
                  </p>
                </div>

                {bannedInfo.proofUrl && (
                  <div className="text-sm">
                    <p className="font-semibold text-muted-foreground text-xs md:text-sm mb-1">Dokumen Bukti:</p>
                    <a
                      href={bannedInfo.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/15 transition-colors"
                    >
                      <FileText className="w-4 h-4" /> Lihat Dokumen Bukti
                    </a>
                  </div>
                )}

                <div className="space-y-1 pt-2">
                  <p className="text-sm font-semibold text-muted-foreground text-xs md:text-sm">Sisa Waktu Penangguhan:</p>
                  <BanCountdown
                    bannedUntil={bannedInfo.bannedUntil}
                    onExpire={() => {
                      // refresh or close
                    }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <Button
                  className="rounded-full w-full h-11"
                  onClick={() => {
                    setShowBannedModal(false);
                    setBannedInfo(null);
                  }}
                >
                  Mengerti
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
