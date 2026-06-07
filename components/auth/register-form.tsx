"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Key,
  ArrowRight,
  ArrowLeft,
  Upload,
  X as CloseIcon,
  FileText,
  Clock,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
  Smartphone,
  Mail,
  Zap,
  Fingerprint,
  AlertTriangle,
  Info,
  Pencil,
} from "lucide-react";
import { generateSecret, verify } from "otplib";
import zxcvbn from "zxcvbn";
import { QRCodeSVG } from "qrcode.react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import ReCAPTCHA from "react-google-recaptcha";
import { logSecurityEvent } from "@/lib/audit-log";
import {
  DocumentUpload,
  type DocumentVerificationState,
} from "@/components/auth/document-upload";

const RegisterMap = dynamic(() => import("./register-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

const STEPS = [
  { id: 1, label: "Profile" },
  { id: 2, label: "Dokumen" },
  { id: 3, label: "Lokasi" },
  { id: 4, label: "Password" },
  { id: 5, label: "Verifikasi" },
  { id: 6, label: "Review" },
] as const;

const STEP_TITLES: Record<number, { title: string; description: string }> = {
  1: { title: "Daftar Akun Desa", description: "Lengkapi data diri Kepala Desa untuk memulai." },
  2: {
    title: "Dokumen Pengesahan",
    description: "Unggah surat pengesahan resmi Kepala Desa.",
  },
  3: { title: "Lokasi Desa", description: "Tentukan koordinat pusat pelayanan desa Anda." },
  4: { title: "Kata Sandi", description: "Buat kata sandi aman untuk akun admin desa." },
  5: {
    title: "Verifikasi & Keamanan",
    description: "Verifikasi OTP, aktifkan 2FA, dan setujui kebijakan.",
  },
  6: {
    title: "Menunggu Verifikasi",
    description: "Superadmin sedang memverifikasi pendaftaran Anda.",
  },
};

function ImageUpload({
  label,
  value,
  onChange,
  shape = "square",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  shape?: "circle" | "square";
}) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", "registrations");
      const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah");
      onChange(data.url);
      toast.success(`${label} berhasil diunggah`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file?.type.startsWith("image/")) uploadFile(file);
        }}
        className={`relative border-2 border-dashed transition-all overflow-hidden flex items-center justify-center
          ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20"}
          ${shape === "circle" ? "rounded-full w-24 h-24 mx-auto" : "rounded-xl w-full aspect-video"}
        `}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-1 right-1 p-1 bg-background/80 rounded-full"
            >
              <CloseIcon className="w-3 h-3" />
            </button>
          </>
        ) : (
          <label className="cursor-pointer flex flex-col items-center p-4">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
              disabled={uploading}
            />
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5 mb-1 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Drag or Click</span>
              </>
            )}
          </label>
        )}
      </div>
    </div>
  );
}

type Props = { token: string };

export function RegisterForm({ token }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState("");

  const [nik, setNik] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const handlePhoneChange = (val: string) => {
    let clean = val.replace(/\D/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.substring(1);
    } else if (clean.startsWith("8")) {
      clean = "62" + clean;
    }
    // Batasi panjang wajar nomor HP
    if (clean.length <= 15) setPhone("+" + clean);
  };
  const [villageName, setVillageName] = useState("");
  const [mapPosition, setMapPosition] = useState<[number, number]>([-6.1754, 106.8272]);
  const [position, setPosition] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [villageThumbnail, setVillageThumbnail] = useState("");
  const [approvalDocument, setApprovalDocument] = useState("");
  const [documentVerification, setDocumentVerification] =
    useState<DocumentVerificationState>(null);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
    suggestions: string[];
    warning: string;
  }>({ score: 0, label: "Kosong", color: "bg-muted", suggestions: [], warning: "" });

  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, label: "Kosong", color: "bg-muted", suggestions: [], warning: "" });
      return;
    }
    const result = zxcvbn(password, [name, email, villageName, nik].filter(Boolean));
    const labels = ["Sangat Lemah", "Lemah", "Sedang", "Kuat", "Sangat Kuat"];
    const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-lime-500", "bg-green-500"];
    setPasswordStrength({
      score: result.score,
      label: labels[result.score],
      color: colors[result.score],
      suggestions: result.feedback.suggestions,
      warning: result.feedback.warning || "",
    });
  }, [password, name, email, villageName, nik]);

  const generatePassword = () => {
    // Generate using multiple character sets for variety
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const all = lower + upper + digits + symbols;
    const crypto = window.crypto;
    const array = new Uint32Array(20);
    crypto.getRandomValues(array);
    // Ensure at least one from each set
    let pwd = [
      lower[array[0] % lower.length],
      lower[array[1] % lower.length],
      upper[array[2] % upper.length],
      upper[array[3] % upper.length],
      digits[array[4] % digits.length],
      digits[array[5] % digits.length],
      symbols[array[6] % symbols.length],
      symbols[array[7] % symbols.length],
    ];
    for (let i = 8; i < 18; i++) {
      pwd.push(all[array[i] % all.length]);
    }
    // Fisher-Yates shuffle
    for (let i = pwd.length - 1; i > 0; i--) {
      const j = array[i] % (i + 1);
      [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
    }
    const newPwd = pwd.join("");
    setPassword(newPwd);
    setPasswordConfirm(newPwd);
    setShowPassword(true);
    toast.success("Sandi kuat telah dibuat — simpan sekarang!", {
      description: "Klik ikon mata untuk melihat, lalu simpan di password manager.",
      duration: 5000,
    });
  };
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [dataSupport, setDataSupport] = useState(true);
  const [enable2FA, setEnable2FA] = useState(true);
  const [ack2FA, setAck2FA] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpVerified, setTotpVerified] = useState(false);
  const [totpCheckCode, setTotpCheckCode] = useState("");

  const [emailTimer, setEmailTimer] = useState(0);
  const [phoneTimer, setPhoneTimer] = useState(0);
  const [emailAttempts, setEmailAttempts] = useState(0);
  const [phoneAttempts, setPhoneAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  const [isRestored, setIsRestored] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(`register_form_${token}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Set all states from localStorage
        if (data.step) setStep(data.step);
        if (data.nik) setNik(data.nik);
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (data.villageName) setVillageName(data.villageName);
        if (data.mapPosition) setMapPosition(data.mapPosition);
        if (data.position) setPosition(data.position);
        if (data.profileImage) setProfileImage(data.profileImage);
        if (data.villageThumbnail) setVillageThumbnail(data.villageThumbnail);
        if (data.approvalDocument) setApprovalDocument(data.approvalDocument);
        if (data.documentVerification) setDocumentVerification(data.documentVerification);
        if (data.agreeTerms !== undefined) setAgreeTerms(data.agreeTerms);
        if (data.dataSupport !== undefined) setDataSupport(data.dataSupport);
        if (data.enable2FA !== undefined) setEnable2FA(data.enable2FA);
        if (data.ack2FA !== undefined) setAck2FA(data.ack2FA);
        if (data.totpSecret) setTotpSecret(data.totpSecret);
        if (data.totpVerified !== undefined) setTotpVerified(data.totpVerified);
        if (data.password) setPassword(data.password);
        if (data.passwordConfirm) setPasswordConfirm(data.passwordConfirm);
        
        // Mark as restored AFTER all setStates are called
        // Note: they will be applied in the next render cycle
        setTimeout(() => setIsRestored(true), 0);
      } catch (e) {
        setIsRestored(true);
      }
    } else {
      setIsRestored(true);
    }
  }, [token]);

  // Save to localStorage on changes - ONLY after initial restoration
  useEffect(() => {
    if (!isRestored) return;
    
    const data = {
      step, nik, name, email, phone, villageName, mapPosition, position,
      profileImage, villageThumbnail, approvalDocument, documentVerification,
      agreeTerms, dataSupport, enable2FA, ack2FA, totpSecret, totpVerified,
      password, passwordConfirm
    };
    localStorage.setItem(`register_form_${token}`, JSON.stringify(data));
  }, [
    token, isRestored, step, nik, name, email, phone, villageName, mapPosition, position,
    profileImage, villageThumbnail, approvalDocument, documentVerification,
    agreeTerms, dataSupport, enable2FA, ack2FA, totpSecret, totpVerified,
    password, passwordConfirm
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (emailTimer > 0) {
      interval = setInterval(() => setEmailTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [emailTimer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phoneTimer > 0) {
      interval = setInterval(() => setPhoneTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [phoneTimer]);

  useEffect(() => {
    if (enable2FA && !totpSecret) {
      const secret = generateSecret();
      setTotpSecret(secret);
    }
  }, [enable2FA, totpSecret]);

  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [error, setError] = useState("");

  const [registrationId, setRegistrationId] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<
    "pending_superadmin" | "approved" | "rejected"
  >("pending_superadmin");
  const [approvedTokens, setApprovedTokens] = useState<{
    adminToken?: string;
    finalAccessToken?: string;
    adminUrl?: string;
  }>({});
  const [estimatedApproval, setEstimatedApproval] = useState("");

  const [prefill, setPrefill] = useState({
    email: "",
    phone: "",
    nik: "",
    name: "",
    villageName: "",
    latitude: "",
    longitude: "",
    position: "",
  });

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch("/api/auth/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, type: "register" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const hasSavedData = localStorage.getItem(`register_form_${token}`);
        
        setPrefill({
          email: data.email || "",
          phone: data.phone || "",
          nik: data.nik || "",
          name: data.name || "",
          villageName: data.villageName || "",
          latitude: data.latitude || "",
          longitude: data.longitude || "",
          position: data.position || "",
        });

        // Only prefill if no saved data exists to avoid overwriting user progress
        if (!hasSavedData) {
          if (data.email) setEmail(data.email);
          if (data.phone) setPhone(data.phone);
          if (data.nik) setNik(data.nik);
          if (data.name) setName(data.name);
          if (data.villageName) setVillageName(data.villageName);
          if (data.position) setPosition(data.position);
          if (data.latitude && data.longitude) {
            setMapPosition([parseFloat(data.latitude), parseFloat(data.longitude)]);
          }
        }
      } catch (err) {
        setTokenError(err instanceof Error ? err.message : "Token tidak valid");
      } finally {
        setValidating(false);
      }
    }
    validate();
  }, [token]);

  const pollStatus = useCallback(async () => {
    if (!registrationId) return;
    try {
      const res = await fetch(`/api/auth/register/status?id=${registrationId}`);
      const data = await res.json();
      if (!res.ok) return;

      setApprovalStatus(data.status);
      if (data.estimatedApproval) setEstimatedApproval(data.estimatedApproval);

      if (data.status === "approved") {
        setApprovedTokens({
          adminToken: data.adminToken,
          finalAccessToken: data.finalAccessToken,
          adminUrl: data.adminUrl,
        });
      }
    } catch {
      /* ignore poll errors */
    }
  }, [registrationId]);

  useEffect(() => {
    if (step !== 6 || !registrationId) return;
    pollStatus();
    const interval = setInterval(pollStatus, 15000);
    return () => clearInterval(interval);
  }, [step, registrationId, pollStatus]);

  async function sendEmailOtp() {
    if (emailTimer > 0) return;
    if (emailAttempts >= MAX_ATTEMPTS) {
      setError("Maksimal percobaan kirim OTP email tercapai. Silakan tunggu 1 jam atau hubungi admin.");
      return;
    }

    setError("");
    setEmailLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email", email, phone, purpose: "register", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const newAttempts = emailAttempts + 1;
      setEmailAttempts(newAttempts);
      const cooldowns = [60, 120, 300, 600, 1800];
      setEmailTimer(cooldowns[newAttempts - 1] || 3600);
      
      toast.success("OTP email terkirim");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal kirim OTP email");
    } finally {
      setEmailLoading(false);
    }
  }

  async function sendPhoneOtp() {
    if (phoneTimer > 0) return;
    if (phoneAttempts >= MAX_ATTEMPTS) {
      setError("Maksimal percobaan kirim OTP WhatsApp tercapai. Silakan tunggu 1 jam atau hubungi admin.");
      return;
    }

    setError("");
    setPhoneLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "phone", email, phone, purpose: "register", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const newAttempts = phoneAttempts + 1;
      setPhoneAttempts(newAttempts);
      const cooldowns = [60, 120, 300, 600, 1800];
      setPhoneTimer(cooldowns[newAttempts - 1] || 3600);
      
      toast.success("OTP WhatsApp terkirim");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal kirim OTP WhatsApp");
    } finally {
      setPhoneLoading(false);
    }
  }

  async function sendBothOtp() {
    if (emailTimer > 0 || phoneTimer > 0) return;
    if (emailAttempts >= MAX_ATTEMPTS || phoneAttempts >= MAX_ATTEMPTS) {
      setError("Maksimal percobaan kirim OTP tercapai.");
      return;
    }

    setError("");
    setEmailLoading(true);
    setPhoneLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "both", email, phone, purpose: "register", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const eAttempts = emailAttempts + 1;
      const pAttempts = phoneAttempts + 1;
      setEmailAttempts(eAttempts);
      setPhoneAttempts(pAttempts);
      
      const cooldowns = [60, 120, 300, 600, 1800];
      setEmailTimer(cooldowns[eAttempts - 1] || 3600);
      setPhoneTimer(cooldowns[pAttempts - 1] || 3600);

      if (data.details) {
        if (data.details.email && data.details.whatsapp) {
          toast.success("OTP Email & WhatsApp terkirim");
        } else if (data.details.email) {
          toast.success("OTP Email terkirim, WhatsApp gagal");
        } else if (data.details.whatsapp) {
          toast.success("OTP WhatsApp terkirim, Email gagal");
        }
      } else {
        toast.success("OTP terkirim ke Email & WhatsApp");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal kirim OTP");
    } finally {
      setEmailLoading(false);
      setPhoneLoading(false);
    }
  }

  async function verifyOtp(channel: "email" | "phone", code: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, channel, code, purpose: "register" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (channel === "email") setEmailVerified(true);
      else setPhoneVerified(true);
      
      toast.success(`Verifikasi ${channel === "email" ? "email" : "WhatsApp"} berhasil`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kode verifikasi tidak valid";
      setError(msg);
      await logSecurityEvent({
        event: "otp_verification_failed",
        email,
        details: { channel, error: msg }
      });
    } finally {
      setLoading(false);
    }
  }

  async function verifyTOTP() {
    if (!totpSecret || !totpCheckCode) {
      setError("Masukkan kode 6-digit dari aplikasi.");
      return;
    }
    setError("");
    try {
      const isValid = await verify({ 
        token: totpCheckCode, 
        secret: totpSecret 
      });
      
      if (isValid) {
        setTotpVerified(true);
        setAck2FA(true);
        toast.success("Aplikasi Authenticator berhasil terhubung!");
      } else {
        setError("Kode TOTP tidak valid. Silakan coba lagi.");
      }
    } catch (err) {
      setError("Gagal memverifikasi kode TOTP.");
    }
  }

  function downloadQRCode() {
    const svg = document.querySelector("#qr-code-2fa svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `2FA-QR-${villageName.toLowerCase().replace(/\s+/g, "-")}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  }

  async function handleSubmit() {
    if (!agreeTerms) {
      setError("Anda harus menyetujui kebijakan privasi");
      return;
    }
    if (!emailVerified || !phoneVerified) {
      setError("Verifikasi OTP email dan WhatsApp wajib diselesaikan");
      return;
    }

    if (!captchaToken && process.env.NODE_ENV === "production") {
      setError("Silakan selesaikan verifikasi reCAPTCHA.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          nik,
          name,
          email,
          phone,
          password,
          villageName,
          latitude: mapPosition[0].toString(),
          longitude: mapPosition[1].toString(),
          position,
          profileImage,
          villageThumbnail,
          approvalDocument,
          captchaToken,
          documentVerification: documentVerification
            ? {
                valid: documentVerification.valid,
                score: documentVerification.score,
                fileHash: documentVerification.fileHash,
              }
            : undefined,
          security: { 
            // 2FA only actually enabled if verified
            enable2FA: enable2FA && totpVerified,
            totpSecret: (enable2FA && totpVerified) ? totpSecret : undefined,
            dataSupport,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.backupCodes?.length) setBackupCodes(data.backupCodes);
      setRegistrationId(data.registrationId);
      setStep(6);
      
      // Clear persisted form data on success
      localStorage.removeItem(`register_form_${token}`);
      
      await logSecurityEvent({
        event: "registration_submitted",
        email,
        details: { villageName, nik, registrationId: data.registrationId }
      });

      toast.success("Pendaftaran diajukan — menunggu verifikasi superadmin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pendaftaran gagal");
    } finally {
      setLoading(false);
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard");
  }

  function downloadBackupCodes() {
    const content = `LAPOR.AH - KODE CADANGAN 2FA\nDesa: ${villageName}\nAdmin: ${name}\nTanggal: ${new Date().toLocaleString()}\n\n${backupCodes.join("\n")}\n\nSIMPAN DI TEMPAT AMAN. JANGAN BAGIKAN KODE INI.`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-codes-${villageName.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File kode cadangan berhasil diunduh");
  }

  if (validating) {
    return (
      <AuthCard title="Memvalidasi link..." description="Mohon tunggu sebentar.">
        <div className="flex justify-center py-8">
          <Spinner size="md" text="Memvalidasi link..." />
        </div>
      </AuthCard>
    );
  }

  if (tokenError) {
    return (
      <AuthCard title="Link tidak valid" description={tokenError}>
        <Link href="/auth/permintaan">
          <Button className="w-full rounded-full">Ajukan permintaan baru</Button>
        </Link>
      </AuthCard>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-6 pb-6 border-b">
              <div className="w-full flex justify-center">
                <ImageUpload label="Foto Profil Admin" value={profileImage} onChange={setProfileImage} shape="circle" />
              </div>
              <ImageUpload label="Thumbnail Foto Desa" value={villageThumbnail} onChange={setVillageThumbnail} />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="villageName">Nama Desa</Label>
                <Input
                  id="villageName"
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  readOnly={!!prefill.villageName}
                  className={prefill.villageName ? "bg-muted" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Jabatan</Label>
                <Input
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Kepala Desa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nik">NIK Kepala Desa</Label>
                <div className="relative">
                  <Input
                    id="nik"
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                    maxLength={16}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="16 digit NIK"
                    className={nik.length > 0 && nik.length < 16 ? "border-amber-400 focus-visible:ring-amber-400" : nik.length === 16 ? "border-green-500 focus-visible:ring-green-500" : ""}
                    required
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold ${nik.length === 16 ? "text-green-600" : "text-muted-foreground"}`}>
                    {nik.length}/16
                  </span>
                </div>
                {nik.length > 0 && nik.length < 16 && (
                  <p className="text-[10px] text-amber-600">NIK harus tepat 16 digit</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} readOnly className="bg-muted text-xs" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telepon (WA)</Label>
                  <div className="relative">
                    <Input 
                      id="phone" 
                      value={phone} 
                      onChange={(e) => handlePhoneChange(e.target.value)} 
                      placeholder="0812..."
                      className="text-xs pr-10" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="text-[10px] font-bold text-muted-foreground">ID</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Button
              className="w-full rounded-full gap-2"
              onClick={() => {
                if (!nik || !name || !villageName) {
                  toast.error("Lengkapi data wajib terlebih dahulu");
                  return;
                }
                if (nik.length !== 16) {
                  toast.error("NIK harus tepat 16 digit");
                  return;
                }
                setStep(2);
              }}
            >
              Lanjut ke Dokumen <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <DocumentUpload
              label="Surat Pengesahan Kepala Desa"
              value={approvalDocument}
              onChange={setApprovalDocument}
              verification={documentVerification}
              onVerificationChange={setDocumentVerification}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
              </Button>
              <Button
                className="flex-[2] rounded-full gap-2"
                disabled={!approvalDocument || !documentVerification?.valid}
                onClick={() => setStep(3)}
              >
                Lanjut ke Lokasi <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Konfirmasi Wilayah Desa
            </Label>
            <RegisterMap
              mapPosition={mapPosition}
              setMapPosition={setMapPosition}
              villageName={villageName}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(2)}>
                Kembali
              </Button>
              <Button className="flex-[2] rounded-full gap-2" onClick={() => setStep(4)}>
                Lanjut ke Password <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Key className="w-4 h-4" /> Buat Kata Sandi
              </Label>
              <button
                type="button"
                onClick={generatePassword}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors px-2.5 py-1 rounded-full border border-primary/30 hover:bg-primary/5"
              >
                <RefreshCw className="w-3 h-3" /> Rekomendasikan
              </button>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Kata Sandi Baru
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  placeholder="Minimal 8 karakter"
                  className="w-full h-10 pl-9 pr-20 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition font-mono tracking-wider"
                  autoComplete="new-password"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {password && (
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      passwordStrength.score <= 1 ? "bg-red-100 text-red-600" :
                      passwordStrength.score === 2 ? "bg-amber-100 text-amber-700" :
                      passwordStrength.score === 3 ? "bg-lime-100 text-lime-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {passwordStrength.label}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded-md hover:bg-muted transition-colors"
                    aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Strength bar — 5 segments */}
              {password && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-5 gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i <= passwordStrength.score ? passwordStrength.color : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.warning && (
                    <p className="text-[10px] text-amber-600 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-px shrink-0" />
                      {passwordStrength.warning}
                    </p>
                  )}
                  {passwordStrength.suggestions.length > 0 && (
                    <ul className="space-y-0.5">
                      {passwordStrength.suggestions.slice(0, 2).map((s, i) => (
                        <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                          <Info className="w-3 h-3 mt-px shrink-0 text-blue-400" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground leading-tight">
                Gunakan kombinasi huruf besar, angka, dan simbol. Min. 8 karakter.
              </p>
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ulangi Kata Sandi
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="passwordConfirm"
                  type={showPasswordConfirm ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Masukkan kembali kata sandi"
                  className={`w-full h-10 pl-9 pr-10 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 transition font-mono tracking-wider ${
                    passwordConfirm && password !== passwordConfirm
                      ? "border-destructive focus:ring-destructive/30"
                      : passwordConfirm && password === passwordConfirm
                      ? "border-green-500 focus:ring-green-400/30"
                      : "focus:ring-primary/40"
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition-colors"
                  aria-label={showPasswordConfirm ? "Sembunyikan" : "Tampilkan"}
                >
                  {showPasswordConfirm ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              {passwordConfirm && password !== passwordConfirm && (
                <p className="text-[10px] text-destructive flex items-center gap-1">
                  <CloseIcon className="w-3 h-3" /> Kata sandi tidak cocok
                </p>
              )}
              {passwordConfirm && password === passwordConfirm && (
                <p className="text-[10px] text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Kata sandi cocok
                </p>
              )}
            </div>

            {/* Save to password manager hint */}
            {password && passwordStrength.score >= 3 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-px" />
                <p className="text-[10px] text-blue-700 leading-relaxed">
                  <strong>Simpan ke Password Manager.</strong> Gunakan Google Password Manager, Bitwarden, atau 1Password agar tidak lupa. Browser Anda mungkin menawarkan untuk menyimpan sandi ini secara otomatis.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(3)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
              </Button>
              <Button
                className="flex-[2] rounded-full gap-2"
                disabled={password.length < 8 || password !== passwordConfirm || passwordStrength.score < 2}
                onClick={() => setStep(5)}
              >
                Lanjut Verifikasi <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            {/* Tombol Kirim Keduanya (Optimasi Kecepatan) */}
            {!emailVerified && !phoneVerified && (
              <Button
                variant="default"
                className="w-full rounded-xl py-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 flex flex-col gap-1 h-auto"
                onClick={sendBothOtp}
                disabled={emailLoading || phoneLoading || emailTimer > 0 || phoneTimer > 0}
              >
                <div className="flex items-center gap-2 font-bold">
                  {(emailLoading || phoneLoading) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Kirim Kode ke Email & WhatsApp
                </div>
                <span className="text-[10px] opacity-70 font-normal">
                  Lebih cepat — kirim ke kedua jalur sekaligus
                </span>
              </Button>
            )}

            {/* ── Email OTP ── */}
            <div className="space-y-3 p-4 rounded-xl border bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" /> Verifikasi Email
                </span>
                {emailVerified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="text-[11px] text-muted-foreground">Kirim ke:</span>
                  <div className="flex items-center gap-1 group">
                    {isEditingEmail ? (
                      <div className="flex items-center gap-1">
                        <Input 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          className="h-7 text-xs w-[180px]" 
                          placeholder="Email baru"
                        />
                        <button 
                          onClick={() => setIsEditingEmail(false)} 
                          className="text-[10px] text-primary font-bold hover:underline"
                        >
                          Simpan
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-medium truncate max-w-[180px]">{email}</span>
                        {!emailVerified && (
                          <button 
                            onClick={() => setIsEditingEmail(true)} 
                            className="p-1 rounded hover:bg-primary/10 text-primary opacity-50 group-hover:opacity-100 transition-all"
                            title="Ubah Email"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Kode 6-digit"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                    maxLength={6}
                    disabled={emailVerified}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    className="font-mono tracking-widest text-center"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={sendEmailOtp} 
                    disabled={emailLoading || emailVerified || emailTimer > 0 || emailAttempts >= MAX_ATTEMPTS}
                  >
                    {emailLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    {emailTimer > 0 ? `Tunggu ${emailTimer}s` : "Kirim"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => verifyOtp("email", emailOtp)}
                    disabled={loading || emailVerified || emailOtp.length !== 6}
                  >
                    Verifikasi
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Phone OTP ── */}
            <div className="space-y-3 p-4 rounded-xl border bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" /> Verifikasi WhatsApp
                </span>
                {phoneVerified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="text-[11px] text-muted-foreground">Kirim ke:</span>
                  <div className="flex items-center gap-1 group">
                    {isEditingPhone ? (
                      <div className="flex items-center gap-1">
                        <Input 
                          value={phone} 
                          onChange={(e) => handlePhoneChange(e.target.value)} 
                          className="h-7 text-xs w-[140px]" 
                          placeholder="Nomor baru"
                        />
                        <button 
                          onClick={() => setIsEditingPhone(false)} 
                          className="text-[10px] text-primary font-bold hover:underline"
                        >
                          Simpan
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-medium">{phone}</span>
                        {!phoneVerified && (
                          <button 
                            onClick={() => setIsEditingPhone(true)} 
                            className="p-1 rounded hover:bg-primary/10 text-primary opacity-50 group-hover:opacity-100 transition-all"
                            title="Ubah Nomor Telepon"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Kode 6-digit"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ""))}
                    maxLength={6}
                    disabled={phoneVerified}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    className="font-mono tracking-widest text-center"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={sendPhoneOtp} 
                    disabled={phoneLoading || phoneVerified || phoneTimer > 0 || phoneAttempts >= MAX_ATTEMPTS}
                  >
                    {phoneLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    {phoneTimer > 0 ? `Tunggu ${phoneTimer}s` : "Kirim WA"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => verifyOtp("phone", phoneOtp)}
                    disabled={loading || phoneVerified || phoneOtp.length < 6}
                  >
                    Verifikasi
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Security Modes ── */}
            <div className="rounded-xl border overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Mode Keamanan Akun</span>
              </div>

              <div className="divide-y">
                {/* 2FA TOTP */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 shrink-0">
                        <Smartphone className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Authenticator App (TOTP)</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Google Authenticator, Authy, atau Microsoft Authenticator.
                        </p>
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                          Direkomendasikan
                        </span>
                      </div>
                    </div>
                    <Switch checked={enable2FA} onCheckedChange={setEnable2FA} />
                  </div>

                  {enable2FA && totpSecret && (
                    <div className="mt-3 p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-4">
                      {/* QR + manual key — responsive */}
                      <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div id="qr-code-2fa" className="bg-white p-3 rounded-xl border shadow-sm shrink-0 relative group">
                          <QRCodeSVG
                            value={`otpauth://totp/Lapor.ah:${encodeURIComponent(email)}?secret=${totpSecret}&issuer=Lapor.ah`}
                            size={112}
                            level="M"
                          />
                          <button 
                            type="button"
                            onClick={downloadQRCode}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-xl text-[9px] font-bold"
                          >
                            UNDUH QR
                          </button>
                        </div>
                        <div className="flex-1 space-y-2 min-w-0">
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            <strong>1.</strong> Buka aplikasi authenticator dan scan QR Code ini.
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            <strong>2.</strong> Tidak bisa scan? Masukkan kode manual:
                          </p>
                          <button
                            type="button"
                            onClick={() => { copyText(totpSecret); }}
                            className="w-full group flex items-center justify-between gap-2 px-3 py-2 bg-white border rounded-lg hover:border-primary/50 transition-colors"
                          >
                            <code className="text-xs font-mono text-foreground break-all text-left">
                              {totpSecret}
                            </code>
                            <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                          </button>
                        </div>
                      </div>

                      {/* TOTP Verification Input */}
                      <div className="pt-3 border-t border-amber-200/50 space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
                          Verifikasi Koneksi
                          {totpVerified && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Kode 6-digit dari aplikasi"
                            value={totpCheckCode}
                            onChange={(e) => setTotpCheckCode(e.target.value.replace(/\D/g, ""))}
                            maxLength={6}
                            disabled={totpVerified}
                            className="h-8 text-xs font-mono text-center tracking-[0.5em]"
                          />
                          <Button 
                            type="button"
                            size="sm" 
                            className="h-8 text-[10px]" 
                            onClick={verifyTOTP} 
                            disabled={totpVerified || totpCheckCode.length < 6}
                          >
                            {totpVerified ? "Terhubung" : "Hubungkan"}
                          </Button>
                        </div>
                        {!totpVerified && (
                          <p className="text-[9px] text-amber-700 leading-tight italic">
                            * Masukkan kode dari aplikasi untuk mengaktifkan 2FA secara otomatis.
                          </p>
                        )}
                      </div>

                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="ack2FA"
                          checked={ack2FA}
                          onChange={(e) => setAck2FA(e.target.checked)}
                          disabled={!totpVerified}
                          className={`mt-0.5 w-4 h-4 rounded accent-primary ${!totpVerified ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        />
                        <label htmlFor="ack2FA" className={`text-[11px] leading-snug cursor-pointer ${!totpVerified ? "opacity-50 cursor-not-allowed" : ""}`}>
                          Saya telah scan QR Code dan memahami pentingnya menyimpan kode cadangan.
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Data Support */}
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-100 shrink-0">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Enkripsi Data Pemerintah</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        AES-256 end-to-end, standar keamanan data pemerintah desa.
                      </p>
                    </div>
                  </div>
                  <Switch checked={dataSupport} onCheckedChange={setDataSupport} />
                </div>

                {/* Session management info */}
                <div className="flex items-start gap-3 p-4 bg-muted/20">
                  <div className="p-2 rounded-lg bg-purple-100 shrink-0">
                    <Lock className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Manajemen Sesi Aman</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Deteksi ancaman real-time, otomatis logout sesi tidak aktif selama 30 menit, dan notifikasi login dari lokasi baru.
                    </p>
                    <span className="inline-block mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                      Aktif Otomatis
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-primary"
              />
              <label htmlFor="terms" className="text-[11px] leading-snug cursor-pointer">
                Saya menyetujui{" "}
                <span className="text-primary underline cursor-pointer">Syarat dan Kebijakan Privasi</span>{" "}
                Lapor.ah untuk Kepala Desa.
              </label>
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}

            <ReCAPTCHA
              ref={recaptchaRef}
              size="normal"
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
              onChange={(token) => setCaptchaToken(token)}
              className="flex justify-center mb-4"
            />

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(4)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
              </Button>
              <Button
                className="flex-[2] rounded-full gap-2"
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Ajukan Pendaftaran <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 text-center">
            {approvalStatus === "pending_superadmin" && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Menunggu Verifikasi Superadmin</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Pendaftaran desa <strong>{villageName}</strong> sedang ditinjau. Estimasi waktu
                    verifikasi: <strong>±24 jam</strong>.
                  </p>
                  {estimatedApproval && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Perkiraan selesai:{" "}
                      {new Date(estimatedApproval).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-xl border bg-muted/30 text-left text-xs space-y-2">
                  <p className="font-medium flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Proses verifikasi:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Validasi dokumen pengesahan kepala desa</li>
                    <li>Pengecekan duplikasi nama desa & lokasi</li>
                    <li>Review data oleh superadmin</li>
                  </ul>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Token akses akan dikirim via email & WhatsApp setelah disetujui.
                </p>
                {backupCodes.length > 0 && (
                  <div className="p-5 rounded-xl border-2 border-amber-300 bg-amber-50 text-left space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" /> Kode Cadangan 2FA
                      </p>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded text-[10px] font-bold uppercase">
                        Sangat Rahasia
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Simpan 10 kode akses darurat ini. Gunakan jika Anda kehilangan akses ke aplikasi authenticator. 
                      <strong>Setiap kode hanya bisa digunakan satu kali.</strong>
                    </p>

                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      {backupCodes.map((code, i) => (
                        <span key={i} className="bg-white px-3 py-2 rounded border border-amber-200 text-center shadow-sm">
                          {code}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-white"
                        onClick={() => copyText(backupCodes.join("\n"))}
                      >
                        <Copy className="w-3 h-3 mr-2" /> Salin
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={downloadBackupCodes}
                      >
                        <Upload className="w-3 h-3 mr-2 rotate-180" /> Unduh .txt
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {approvalStatus === "approved" && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Pendaftaran Disetujui!</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Token dikirim ke email & WhatsApp. Untuk login gunakan:
                  </p>
                  <p className="text-sm font-medium mt-1">
                    Email: <span className="font-mono">{email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    + password yang Anda buat saat pendaftaran (bukan token ADM/FINAL).
                  </p>
                </div>
                <div className="p-4 rounded-xl border bg-green-50/50 text-left space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs">Token Admin</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs font-mono">{approvedTokens.adminToken}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyText(approvedTokens.adminToken || "")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs">Token Final</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs font-mono">{approvedTokens.finalAccessToken}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyText(approvedTokens.finalAccessToken || "")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                {approvedTokens.adminUrl && (
                  <Button
                    className="w-full rounded-full"
                    onClick={() => {
                      try {
                        const u = new URL(approvedTokens.adminUrl!);
                        router.push(`${u.pathname}${u.search}`);
                      } catch {
                        router.push(approvedTokens.adminUrl!);
                      }
                    }}
                  >
                    Buka Panel Admin
                  </Button>
                )}
                <Button
                  variant={approvedTokens.adminUrl ? "outline" : "default"}
                  className="w-full rounded-full"
                  onClick={() => router.push(`/masuk?email=${encodeURIComponent(email)}`)}
                >
                  Masuk ke Akun
                </Button>
              </>
            )}

            {approvalStatus === "rejected" && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="font-semibold text-lg">Pendaftaran Ditolak</h3>
                <p className="text-sm text-muted-foreground">
                  Hubungi support atau ajukan permintaan baru.
                </p>
                <Link href="/auth/permintaan">
                  <Button className="w-full rounded-full">Ajukan Ulang</Button>
                </Link>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const meta = STEP_TITLES[step] || STEP_TITLES[1];

  return (
    <AuthCard title={meta.title} description={meta.description}>
      <div className="mb-8">
        <div className="flex justify-between mb-2 gap-0.5">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                s.id <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
          {STEPS.map((s) => (
            <span key={s.id} className={s.id === step ? "text-primary" : ""}>
              {s.label}
            </span>
          ))}
        </div>
      </div>
      {renderStep()}
      </AuthCard>
  );
}
