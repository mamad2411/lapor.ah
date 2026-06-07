"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RequestType = "register" | "reset";

export function RequestAccessForm() {
  const [type, setType] = useState<RequestType>("register");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [villageName, setVillageName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  
  // Dialog state
  const [showExistsDialog, setShowExistsDialog] = useState(false);
  const [existsMessage, setExistsMessage] = useState("");

  async function handleSubmit(e?: React.FormEvent, action?: "resend" | "new") {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    
    if (!action) {
      setShowExistsDialog(false);
    }

    try {
      const res = await fetch("/api/auth/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type, 
          email, 
          phone, 
          villageName, 
          description,
          action
        }),
      });
      
      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      if (res.status === 409 && data.token_exists) {
        setExistsMessage(data.message);
        setShowExistsDialog(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Permintaan gagal`);
      }

      setSuccess(
        data.message ||
          "Permintaan diterima. Cek email Anda untuk link sekali pakai (berlaku 24 jam)."
      );
      
      // Clear form on success
      if (!action || action === "new") {
        setEmail("");
        setPhone("");
        setVillageName("");
        setDescription("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthCard
        title="Permintaan Akses"
        description="Pendaftaran dan reset password hanya melalui link dari sistem."
        footerContent={
          <p>
            Sudah punya akun?{" "}
            <Link href="/masuk" className="text-foreground underline underline-offset-4">
              Masuk
            </Link>
          </p>
        }
      >
        <div className="flex gap-2 mb-6 p-1 bg-muted rounded-full">
          <button
            type="button"
            onClick={() => setType("register")}
            className={`flex-1 py-2 text-sm rounded-full transition-colors ${
              type === "register" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
            }`}
          >
            Daftar baru
          </button>
          <button
            type="button"
            onClick={() => setType("reset")}
            className={`flex-1 py-2 text-sm rounded-full transition-colors ${
              type === "reset" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
            }`}
          >
            Lupa password
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {type === "register" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="villageName">Nama Desa</Label>
                <Input
                  id="villageName"
                  placeholder="Contoh: Desa Makmur Jaya"
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </>
          )}

          {type === "reset" && (
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor telepon</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              placeholder={
                type === "register"
                  ? "Contoh: Saya ingin bergabung dengan Lapor.ah"
                  : "Contoh: Lupa password akun Lapor.ah"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={loading}
              className="min-h-[100px]"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {success && (
            <p className="text-sm text-green-800 bg-green-50 px-3 py-2 rounded-md border border-green-200">
              {success}
            </p>
          )}
          <Button type="submit" className="w-full h-11 rounded-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim permintaan"}
          </Button>
        </form>
      </AuthCard>

      <AlertDialog open={showExistsDialog} onOpenChange={setShowExistsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permintaan Sudah Ada</AlertDialogTitle>
            <AlertDialogDescription>
              {existsMessage}
              <br /><br />
              Apa yang ingin Anda lakukan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={() => handleSubmit(undefined, "resend")}
              disabled={loading}
              className="sm:order-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Kirim Ulang Link
            </Button>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(undefined, "new");
              }}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90 text-white sm:order-3"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Buat Token Baru
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

