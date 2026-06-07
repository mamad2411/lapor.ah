"use client";

import { useState } from "react";
import { BarChart3, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { DiskusiPoll } from "@/lib/warga/types";
import { getVoterKey } from "@/lib/warga/voter-key";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DiskusiPollViewProps {
  postId: string;
  poll: DiskusiPoll;
  onVoted?: (poll: DiskusiPoll) => void;
  compact?: boolean;
}

function voteStorageKey(postId: string) {
  return `diskusi_poll_voted_${postId}`;
}

export function DiskusiPollView({ postId, poll, onVoted, compact }: DiskusiPollViewProps) {
  const [localPoll, setLocalPoll] = useState(poll);
  const [votedOption, setVotedOption] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(voteStorageKey(postId));
  });
  const [loading, setLoading] = useState(false);

  const ended = localPoll.endsAt ? new Date(localPoll.endsAt) < new Date() : false;
  const total = localPoll.totalVotes || localPoll.options.reduce((s, o) => s + o.votes, 0);

  async function handleVote(optionId: string) {
    if (votedOption || ended) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/diskusi/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, voterKey: getVoterKey() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = {
        ...localPoll,
        options: data.poll.options,
        totalVotes: data.poll.totalVotes,
      };
      setLocalPoll(updated);
      setVotedOption(optionId);
      localStorage.setItem(voteStorageKey(postId), optionId);
      onVoted?.(updated);
      toast.success("Suara kamu tercatat!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memilih");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("rounded-xl border bg-muted/30 p-3 space-y-2", compact && "p-2")}>
      <div className="flex items-center gap-2 text-xs font-medium">
        <BarChart3 className="w-3.5 h-3.5 text-primary" />
        {localPoll.question}
        {ended && <span className="text-muted-foreground">(berakhir)</span>}
      </div>
      <div className="space-y-2">
        {localPoll.options.map((opt) => {
          const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
          const isChosen = votedOption === opt.id;
          return (
            <div key={opt.id}>
              {votedOption || ended ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={cn(isChosen && "font-medium text-primary")}>
                      {isChosen && <Check className="w-3 h-3 inline mr-0.5" />}
                      {opt.text}
                    </span>
                    <span className="text-muted-foreground">{pct}% · {opt.votes}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  disabled={loading}
                  onClick={() => handleVote(opt.id)}
                >
                  {opt.text}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">{total} suara</p>
    </div>
  );
}
