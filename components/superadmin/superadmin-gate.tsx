"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getAuthClient } from "@/lib/firebase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";

const SEQUENCE = ["z", "a", "i"] as const;

export function SuperadminGate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const indexRef = useRef(0);
  const ctrlRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      indexRef.current = 0;
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") ctrlRef.current = true;
      if (!ctrlRef.current) return;

      const expected = SEQUENCE[indexRef.current];
      if (e.key.toLowerCase() === expected) {
        e.preventDefault();
        indexRef.current += 1;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(reset, 2500);

        if (indexRef.current >= SEQUENCE.length) {
          reset();
          setOpen(true);
        }
      } else if (e.key.length === 1 && !["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
        reset();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        ctrlRef.current = false;
        reset();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const auth = getAuthClient();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/ops/v1/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await auth.signOut();
      setOpen(false);
      toast.success("Akses operasional dibuka");
      router.push(data.redirect);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Autentikasi gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <KeyRound className="w-5 h-5" />
            Verifikasi Operasional
          </DialogTitle>
          <DialogDescription>
            Masuk dengan akun superadmin untuk mengakses panel operasional. Sesi berlaku 8 jam.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ops-email">Email</Label>
            <Input
              id="ops-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ops-pass">Password</Label>
            <Input
              id="ops-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Masuk Panel
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
