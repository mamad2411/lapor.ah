"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PengaturanTemplateForm() {
  const searchParams = useSearchParams();
  const villageId = searchParams.get("id") || "";
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<
    { id: string; question: string; answer: string; keywords: string[] }[]
  >([]);

  const load = () => {
    if (!villageId) return;
    fetch(`/api/pesan/templates?villageId=${villageId}`)
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []));
  };

  useEffect(() => { load(); }, [villageId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!villageId) {
      toast.error("Buka admin dengan parameter ?id=villageId");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/pesan/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId,
          question,
          answer,
          keywords: keywords.split(/[,;]+/).map((k) => k.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal simpan");

      setQuestion("");
      setAnswer("");
      setKeywords("");
      load();
      toast.success("Template ditambahkan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Template</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Pertanyaan</Label>
              <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Jam buka kantor desa?" required />
            </div>
            <div className="space-y-2">
              <Label>Kata Kunci (pisah koma)</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="jam, buka, kantor" />
            </div>
            <div className="space-y-2">
              <Label>Jawaban Bot</Label>
              <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} required />
            </div>
            <Button type="submit" disabled={loading} className="rounded-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Simpan Template
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template Aktif</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada template custom</p>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="p-3 rounded-lg border text-sm">
                <p className="font-medium">{t.question}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.answer}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
