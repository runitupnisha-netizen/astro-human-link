import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface QueueRow {
  id: string;
  created_at: string;
  content_type: string;
  reporter_id: string | null;
  target_user_id: string | null;
  content_snapshot: string | null;
  ai_provider: string | null;
  ai_flagged: boolean | null;
  ai_categories: any;
  ai_score: number | null;
  status: string;
  reason: string | null;
}

const STATUSES = ["pending", "approved", "removed", "banned"] as const;
const TYPES = ["all", "text", "image", "audio"] as const;

const AdminModeration = () => {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("moderation_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (typeFilter !== "all") q = q.eq("content_type", typeFilter);
    const { data, error } = await q;
    if (error) toast({ title: "Failed to load queue", description: error.message, variant: "destructive" });
    setRows((data as QueueRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, statusFilter, typeFilter]);

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const updateRow = async (id: string, status: string, action_taken?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("moderation_queue")
      .update({
        status,
        action_taken: action_taken ?? status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Marked ${status}` });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pt-20">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Moderation Queue</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Review flagged content. Auto-flagged by AI or reported by users.
        </p>

        <div className="flex gap-3 mb-4 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t === "all" ? "All types" : t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">When</th>
                <th className="p-3">Type</th>
                <th className="p-3">Reporter</th>
                <th className="p-3">Target</th>
                <th className="p-3">AI</th>
                <th className="p-3">Snapshot</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nothing in the queue.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">{r.content_type}</td>
                  <td className="p-3 text-xs font-mono">{r.reporter_id?.slice(0, 8) ?? "—"}</td>
                  <td className="p-3 text-xs font-mono">{r.target_user_id?.slice(0, 8) ?? "—"}</td>
                  <td className="p-3 text-xs">
                    {r.ai_provider ?? "—"}
                    {r.ai_score != null && <div>score: {Number(r.ai_score).toFixed(2)}</div>}
                  </td>
                  <td className="p-3 max-w-sm">
                    {expanded === r.id ? (
                      <div className="whitespace-pre-wrap break-words text-xs">{r.content_snapshot}</div>
                    ) : (
                      <div className="truncate text-xs">{r.content_snapshot}</div>
                    )}
                    {r.content_snapshot && (
                      <button
                        className="text-xs text-primary underline mt-1"
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      >
                        {expanded === r.id ? "Collapse" : "View full"}
                      </button>
                    )}
                  </td>
                  <td className="p-3">{r.status}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" onClick={() => updateRow(r.id, "approved", "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateRow(r.id, "removed", "content_removed")}>
                        Remove
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateRow(r.id, "banned", "ban_1d")}>
                        Ban 1d
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateRow(r.id, "banned", "ban_7d")}>
                        Ban 7d
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateRow(r.id, "banned", "ban_perm")}>
                        Ban perm
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminModeration;