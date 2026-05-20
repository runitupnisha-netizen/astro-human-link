import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Ban, Flag, UserX } from "lucide-react";
import { moderateContent } from "@/lib/moderation";

interface UserActionsProps {
  targetUserId: string;
  targetName: string;
  matchId?: string;
  onBlock?: () => void;
  onUnmatch?: () => void;
  /**
   * Optional content metadata. When provided (e.g. when reporting an
   * individual message), it is persisted to the moderation queue so
   * reviewers see exactly what was flagged.
   */
  contentType?: "profile" | "message" | "photo" | "voice" | "bio";
  contentId?: string;
  contentSnapshot?: string;
}

const REPORT_REASONS = [
  "Inappropriate content",
  "Harassment or bullying",
  "Fake profile / catfishing",
  "Spam or scam",
  "Underage user",
  "Offensive behavior",
  "Other",
];

const UserActions = ({
  targetUserId,
  targetName,
  matchId,
  onBlock,
  onUnmatch,
  contentType = "profile",
  contentId,
  contentSnapshot,
}: UserActionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReport, setShowReport] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [showUnmatch, setShowUnmatch] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: targetUserId });
      toast({ title: `${targetName} has been blocked` });
      setShowBlock(false);
      onBlock?.();
    } catch {
      toast({ title: "Failed to block user", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    if (!user || !reportReason) return;
    setLoading(true);
    try {
      // 1. Persist the report (legacy table, kept for backwards compatibility).
      await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_id: targetUserId,
        reason: reportReason,
        details: reportDetails || null,
        content_type: contentType,
        content_id: contentId ?? null,
        content_snapshot: contentSnapshot ?? null,
      } as never);

      // 2. Run the vendor-agnostic moderation adapter (currently a no-op
      //    placeholder — see src/lib/moderation/index.ts). Result is best-effort
      //    and never blocks the report from being filed for human review.
      const moderation = contentSnapshot
        ? await moderateContent({
            type: contentType === "photo" ? "image"
                : contentType === "voice" ? "audio"
                : "text",
            content: contentSnapshot,
            meta: { contentId, targetUserId, reason: reportReason },
          })
        : null;

      // 3. Always enqueue for human review.
      await supabase.from("moderation_queue").insert({
        reporter_id: user.id,
        target_user_id: targetUserId,
        content_type: contentType,
        content_id: contentId ?? null,
        content_snapshot: contentSnapshot ?? null,
        reason: reportReason,
        details: reportDetails || null,
        ai_provider: moderation?.provider ?? null,
        ai_flagged: moderation?.flagged ?? null,
        ai_categories: moderation?.categories ?? null,
        ai_score: moderation?.score ?? null,
      } as never);

      toast({ title: "Report submitted", description: "Thank you. We'll review this shortly." });
      setShowReport(false);
      setReportReason("");
      setReportDetails("");
    } catch {
      toast({ title: "Failed to submit report", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUnmatch = async () => {
    if (!user || !matchId) return;
    setLoading(true);
    try {
      // Delete messages first, then the match
      await supabase.from("messages").delete().eq("match_id", matchId);
      await supabase.from("matches").delete().eq("id", matchId);
      toast({ title: `Unmatched from ${targetName}` });
      setShowUnmatch(false);
      onUnmatch?.();
    } catch {
      toast({ title: "Failed to unmatch", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => setShowReport(true)}>
          <Flag className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => setShowBlock(true)}>
          <Ban className="w-4 h-4" />
        </Button>
        {matchId && (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => setShowUnmatch(true)}>
            <UserX className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Flag className="w-5 h-5 text-destructive" /> Report {targetName}</DialogTitle>
            <DialogDescription>Help us keep Stellara safe. Select a reason below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    reportReason === reason
                      ? "bg-destructive/20 text-destructive border border-destructive/40"
                      : "bg-muted/40 text-muted-foreground border border-border/50 hover:bg-muted/60"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Additional details (optional)</Label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Tell us more about what happened..."
                className="mt-1 bg-muted/30 border-border/50"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReport(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReport} disabled={!reportReason || loading}>
              {loading ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={showBlock} onOpenChange={setShowBlock}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban className="w-5 h-5 text-destructive" /> Block {targetName}?</DialogTitle>
            <DialogDescription>They won't be able to see your profile or message you. You can unblock them later in Settings.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlock(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlock} disabled={loading}>
              {loading ? "Blocking..." : "Block User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unmatch Dialog */}
      <Dialog open={showUnmatch} onOpenChange={setShowUnmatch}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserX className="w-5 h-5 text-destructive" /> Unmatch from {targetName}?</DialogTitle>
            <DialogDescription>This will remove the match and delete all messages. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnmatch(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleUnmatch} disabled={loading}>
              {loading ? "Unmatching..." : "Unmatch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserActions;
