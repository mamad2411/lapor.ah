"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, ShieldCheck, Mail, Smartphone, Lock, KeyRound, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { normalizePhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

type Props = { token: string };

function getPasswordStrength(pwd: string) {
  if (!pwd) return { score: 0, label: "Belum Diisi", color: "bg-muted", textColor: "text-muted-foreground", width: "w-0" };
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[a-z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (pwd.length < 8) {
    return { score: 1, label: "Sangat Lemah (Min. 8 Karakter)", color: "bg-red-500", textColor: "text-red-500", width: "w-1/4" };
  }
  if (score <= 2) {
    return { score: 2, label: "Lemah", color: "bg-orange-500", textColor: "text-orange-500", width: "w-2/4" };
  }
  if (score <= 4) {
    return { score: 3, label: "Sedang", color: "bg-yellow-500", textColor: "text-yellow-500", width: "w-3/4" };
  }
  return { score: 4, label: "Sangat Kuat", color: "bg-green-500", textColor: "text-green-500", width: "w-full" };
}

export function ResetPasswordForm({ token }: Props) {
  const router = useRouter();
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Navigation wizard state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // Slide inputs
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);

  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFaMethod, setTwoFaMethod] = useState<"totp" | "backup">("totp");
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendEmailOtp = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email", email, phone, purpose: "reset", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmailOtpSent(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal kirim OTP email");
      return false;
    } finally {
      setLoading(false);
    }
  }, [email, phone, token]);

  const sendPhoneOtp = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "phone",
          email,
          phone,
          purpose: "reset",
          token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPhoneOtpSent(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal kirim OTP telepon");
      return false;
    } finally {
      setLoading(false);
    }
  }, [email, phone, token]);

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch("/api/auth/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, type: "reset" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setEmail(data.email);
        setPhone(data.phone);
        setRequires2FA(Boolean(data.requires2FA));
      } catch (err) {
        setTokenError(err instanceof Error ? err.message : "Token tidak valid");
      } finally {
        setValidating(false);
      }
    }
    validate();
  }, [token]);

  // Sequential Auto-OTP on mount
  useEffect(() => {
    if (!validating && email && phone && !emailOtpSent && !loading) {
      sendEmailOtp().then(success => {
        if (success) {
          setTimeout(() => {
            sendPhoneOtp();
          }, 1000);
        }
      });
    }
  }, [validating, email, phone, emailOtpSent, loading, sendEmailOtp, sendPhoneOtp]);

  const nextStep = () => {
    setDirection(1);
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setDirection(-1);
    setStep(prev => prev - 1);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setError("Konfirmasi kata sandi tidak cocok");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          emailOtp,
          phoneOtp,
          totpCode: requires2FA && twoFaMethod === "totp" ? totpCode : undefined,
          backupCode: requires2FA && twoFaMethod === "backup" ? backupCode : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/masuk?reset=ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset gagal");
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <AuthCard title="Memvalidasi link..." description="Mohon tunggu sebentar.">
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AuthCard>
    );
  }

  if (tokenError) {
    return (
      <AuthCard title="Link tidak valid" description={tokenError}>
        <Link href="/auth/permintaan">
          <Button className="w-full rounded-full">Ajukan permintaan reset</Button>
        </Link>
      </AuthCard>
    );
  }

  const strength = getPasswordStrength(password);
  const totalSteps = requires2FA ? 3 : 2;

  // Slide sliding animation variants
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  return (
    <AuthCard
      title="Reset Kata Sandi"
      description={`Atur kata sandi baru untuk ${email}`}
    >
      {/* Step Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-medium">
          <span>Langkah {step} dari {totalSteps}</span>
          <span className="font-semibold text-foreground">
            {step === 1 ? "Verifikasi OTP" : step === 2 ? "Kata Sandi Baru" : "Verifikasi 2FA"}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-1">
          <div className={`h-full rounded-full transition-all duration-300 ${step >= 1 ? "bg-foreground w-1/3" : "bg-muted"}`} />
          <div className={`h-full rounded-full transition-all duration-300 ${step >= 2 ? "bg-foreground w-1/3" : "bg-muted"}`} />
          {requires2FA && (
            <div className={`h-full rounded-full transition-all duration-300 ${step >= 3 ? "bg-foreground w-1/3" : "bg-muted"}`} />
          )}
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
                <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Verifikasi Identitas Anda</span>
                </div>
                
                {/* Email OTP */}
                <div className="space-y-2">
                  <Label htmlFor="emailOtp" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>OTP Email (6 Digit)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="emailOtp"
                      placeholder="Masukkan 6 digit kode email"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="text-center font-mono text-lg tracking-widest"
                      required
                    />
                    <Button type="button" variant="outline" onClick={sendEmailOtp} disabled={loading} className="shrink-0 text-xs">
                      {emailOtpSent ? "Kirim Ulang" : "Kirim OTP"}
                    </Button>
                  </div>
                  {emailOtpSent && (
                    <p className="text-[10px] text-muted-foreground italic">
                      Kode dikirim ke {email}
                    </p>
                  )}
                </div>

                {/* Phone OTP */}
                <div className="space-y-2">
                  <Label htmlFor="phoneOtp" className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <span>OTP WhatsApp / SMS (6 Digit)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="phoneOtp"
                      placeholder="Masukkan 6 digit kode WA"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="text-center font-mono text-lg tracking-widest"
                      required
                    />
                    <Button type="button" variant="outline" onClick={sendPhoneOtp} disabled={loading} className="shrink-0 text-xs">
                      {phoneOtpSent ? "Kirim Ulang" : "Kirim OTP"}
                    </Button>
                  </div>
                  {phoneOtpSent && (
                    <p className="text-[10px] text-muted-foreground italic">
                      OTP telepon via WhatsApp (Fonnte) atau SMS Firebase
                    </p>
                  )}
                  {phone && (
                    <p className="text-[10px] text-muted-foreground">
                      Nomor tujuan: <span className="font-mono font-semibold">+{normalizePhone(phone)}</span>
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}

              <Button
                type="button"
                onClick={nextStep}
                disabled={emailOtp.length !== 6 || phoneOtp.length !== 6 || loading}
                className="w-full h-11 rounded-full flex items-center justify-center gap-2"
              >
                <span>Langkah Selanjutnya</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Kata Sandi Baru</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    className="pr-10"
                    placeholder="Masukkan sandi minimal 8 karakter"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Strength Indicator */}
                {password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span>Kekuatan Kata Sandi:</span>
                      <span className={`font-semibold ${strength.textColor}`}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Password Confirm Input */}
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Konfirmasi Kata Sandi Baru</Label>
                <div className="relative">
                  <Input
                    id="passwordConfirm"
                    type={showPasswordConfirm ? "text" : "password"}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="pr-10"
                    placeholder="Ketik ulang sandi baru"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={loading}
                  className="rounded-full flex items-center justify-center gap-1.5 px-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </Button>
                {requires2FA ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={password.length < 8 || password !== passwordConfirm || loading}
                    className="flex-1 rounded-full flex items-center justify-center gap-2"
                  >
                    <span>Langkah Terakhir</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={password.length < 8 || password !== passwordConfirm || loading}
                    className="flex-1 rounded-full flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>Simpan Kata Sandi</span>
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && requires2FA && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
                <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Verifikasi Keamanan 2FA</span>
                </div>

                {/* Exclusive Tabs Selection */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-full">
                  <button
                    type="button"
                    onClick={() => setTwoFaMethod("totp")}
                    className={`py-1.5 text-xs rounded-full transition-colors ${
                      twoFaMethod === "totp" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
                    }`}
                  >
                    Google Authenticator
                  </button>
                  <button
                    type="button"
                    onClick={() => setTwoFaMethod("backup")}
                    className={`py-1.5 text-xs rounded-full transition-colors ${
                      twoFaMethod === "backup" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
                    }`}
                  >
                    Kode Cadangan
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {twoFaMethod === "totp" ? (
                    <motion.div
                      key="totp-input"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="totpCode" className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-muted-foreground" />
                        <span>Kode Authenticator (6 Digit)</span>
                      </Label>
                      <Input
                        id="totpCode"
                        placeholder="000000"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        className="text-center font-mono text-lg tracking-widest"
                        required
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="backup-input"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="backupCode" className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <span>Kode Cadangan (Backup Code)</span>
                      </Label>
                      <Input
                        id="backupCode"
                        placeholder="Masukkan kode cadangan Anda"
                        value={backupCode}
                        onChange={(e) => setBackupCode(e.target.value)}
                        className="text-center font-mono"
                        required
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={loading}
                  className="rounded-full flex items-center justify-center gap-1.5 px-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    (twoFaMethod === "totp" && totpCode.length !== 6) ||
                    (twoFaMethod === "backup" && !backupCode.trim()) ||
                    loading
                  }
                  className="flex-1 rounded-full flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Simpan Kata Sandi</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </AuthCard>
  );
}
