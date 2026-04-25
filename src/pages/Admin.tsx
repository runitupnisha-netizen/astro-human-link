import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Shield, Users, AlertTriangle, Crown, Telescope, Sparkles, Loader2, MessageCircleQuestion, Check, X } from "lucide-react";

type Report = {
  id: string;
  created_at: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string | null;
  status: string;
  reporter_name?: string;
  reported_name?: string;
};

type AdminProfile = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  is_suspended: boolean;
  email?: string;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-800 border-amber-300",
    Reviewed: "bg-slate-100 text-slate-700 border-slate-300",
    "Action Taken": "bg-rose-100 text-rose-800 border-rose-300",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${map[status] ?? map.Pending}`}>
      {status}
    </span>
  );
};

const MetricsSection = () => {
  const [metrics, setMetrics] = useState({ total: 0, onboarded: 0, pro: 0, pending: 0 });

  useEffect(() => {
    const load = async () => {
      const [{ count: total }, { count: onboarded }, { count: pending }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("onboarding_complete", true),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "Pending"),
      ]);
      // Pro = demo allowlist + anyone with a Stripe-backed entitlement.
      // No is_pro column exists; we surface a placeholder of "1" (the demo account)
      // and let the admin look up Pro status per user via subscription check.
      setMetrics({
        total: total ?? 0,
        onboarded: onboarded ?? 0,
        pro: 1,
        pending: pending ?? 0,
      });
    };
    load();
  }, []);

  const cards = [
    { label: "Total Users", value: metrics.total, icon: Users, color: "text-blue-600" },
    { label: "Onboarded", value: metrics.onboarded, icon: Shield, color: "text-emerald-600" },
    { label: "Pro Subscribers", value: metrics.pro, icon: Crown, color: "text-amber-600" },
    { label: "Pending Reports", value: metrics.pending, icon: AlertTriangle, color: "text-rose-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="p-4 bg-white border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{value.toLocaleString()}</p>
            </div>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </Card>
      ))}
    </div>
  );
};

const ReportsSection = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("Failed to load reports");
      setLoading(false);
      return;
    }
    const userIds = Array.from(new Set((data ?? []).flatMap((r) => [r.reporter_id, r.reported_id])));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username")
      .in("user_id", userIds);
    const nameMap = new Map(
      (profiles ?? []).map((p) => [p.user_id, p.display_name || p.username || p.user_id.slice(0, 8)])
    );
    setReports(
      (data ?? []).map((r) => ({
        ...r,
        reporter_name: nameMap.get(r.reporter_id) ?? r.reporter_id.slice(0, 8),
        reported_name: nameMap.get(r.reported_id) ?? r.reported_id.slice(0, 8),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reports").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error("Update failed");
    toast.success(`Marked as ${status}`);
    load();
  };

  const suspendUser = async (report: Report) => {
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ is_suspended: true, is_paused: true })
      .eq("user_id", report.reported_id);
    if (pErr) return toast.error("Failed to suspend");
    await supabase.from("reports").update({ status: "Action Taken", reviewed_at: new Date().toISOString() }).eq("id", report.id);
    toast.success(`Suspended ${report.reported_name}`);
    load();
  };

  if (loading) return <p className="text-sm text-slate-500 py-4">Loading reports…</p>;
  if (reports.length === 0)
    return <p className="text-sm text-slate-500 py-8 text-center">No reports filed.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-left text-slate-600 text-xs uppercase tracking-wide">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Reporter</th>
            <th className="px-3 py-2 font-medium">Reported</th>
            <th className="px-3 py-2 font-medium">Reason</th>
            <th className="px-3 py-2 font-medium">Details</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{formatDate(r.created_at)}</td>
              <td className="px-3 py-3 text-slate-700">{r.reporter_name}</td>
              <td className="px-3 py-3 text-slate-900 font-medium">{r.reported_name}</td>
              <td className="px-3 py-3 text-slate-700">{r.reason}</td>
              <td className="px-3 py-3 text-slate-600 max-w-xs truncate" title={r.details ?? ""}>
                {r.details || "—"}
              </td>
              <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
              <td className="px-3 py-3">
                <div className="flex gap-1.5 flex-wrap">
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => suspendUser(r)}>
                    Suspend
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(r.id, "Reviewed")}>
                    Reviewed
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateStatus(r.id, "Action Taken")}>
                    Dismiss
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const UserLookupSection = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const term = `%${query.trim()}%`;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, created_at, is_suspended")
      .or(`display_name.ilike.${term},username.ilike.${term}`)
      .limit(25);
    if (error) toast.error("Search failed");
    setResults((data as AdminProfile[]) ?? []);
    setSearching(false);
  };

  const setSuspension = async (userId: string, suspended: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: suspended, is_paused: suspended })
      .eq("user_id", userId);
    if (error) return toast.error("Update failed");
    toast.success(suspended ? "User suspended" : "User reinstated");
    setResults((prev) => prev.map((p) => (p.user_id === userId ? { ...p, is_suspended: suspended } : p)));
  };

  const grantPro = async (userId: string) => {
    toast.info("Pro entitlement is managed via Stripe / demo allowlist. Add this email to the allowlist in check-subscription edge function.");
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Permanently delete this user's data? This cannot be undone.")) return;
    const { error } = await supabase.rpc("delete_user_data", { target_user_id: userId });
    if (error) return toast.error(`Delete failed: ${error.message}`);
    toast.success("User data deleted");
    setResults((prev) => prev.filter((p) => p.user_id !== userId));
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search by name or @username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          className="bg-white border-slate-300"
        />
        <Button onClick={search} disabled={searching}>
          <Search className="w-4 h-4 mr-1" /> Search
        </Button>
      </div>
      {results.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          {searching ? "Searching…" : "Enter a name or username to search."}
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((u) => (
            <Card key={u.user_id} className="p-3 bg-white border-slate-200 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                {u.avatar_url && <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {u.display_name || u.username || "Unnamed"}
                </p>
                <p className="text-xs text-slate-500">
                  Joined {formatDate(u.created_at)} · {u.is_suspended ? <Badge variant="destructive" className="ml-1">Suspended</Badge> : "Active"}
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {u.is_suspended ? (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSuspension(u.user_id, false)}>
                    Reinstate
                  </Button>
                ) : (
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setSuspension(u.user_id, true)}>
                    Suspend
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => grantPro(u.user_id)}>
                  Grant Pro
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-600" onClick={() => deleteUser(u.user_id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const Admin = () => {
  const { isAdmin, loading } = useIsAdmin();
  const [recomputing, setRecomputing] = useState(false);

  const recomputeDemoChart = async () => {
    setRecomputing(true);
    try {
      const { data, error } = await supabase.functions.invoke("recompute-chart", {
        body: {},
      });
      if (error) throw error;
      const after = (data as { after?: Record<string, string | null> } | null)?.after;
      if (after) {
        toast.success(
          `Demo chart updated · ☉ ${after.sun_sign} · ☽ ${after.moon_sign} · ↗ ${after.rising_sign ?? "—"}`,
        );
      } else {
        toast.success("Demo chart recomputed");
      }
    } catch (e) {
      toast.error(`Recompute failed: ${(e as Error).message}`);
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Checking permissions…</p>
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-slate-700" />
            <h1 className="text-xl font-semibold">Stellara Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={recomputeDemoChart}
              disabled={recomputing}
            >
              {recomputing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {recomputing ? "Recomputing…" : "Recompute demo chart"}
            </Button>
            <Link
              to="/admin/chart-parity"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Telescope className="w-3.5 h-3.5" />
              Chart Parity
            </Link>
            <Link
              to="/admin/astral-accuracy"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Telescope className="w-3.5 h-3.5" />
              Astral Accuracy
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6">
        <MetricsSection />
        <Tabs defaultValue="reports">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="reports">Reports Queue</TabsTrigger>
            <TabsTrigger value="users">User Lookup</TabsTrigger>
            <TabsTrigger value="lyra">Lyra Probe</TabsTrigger>
          </TabsList>
          <TabsContent value="reports" className="mt-4">
            <Card className="bg-white border-slate-200">
              <ReportsSection />
            </Card>
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UserLookupSection />
          </TabsContent>
          <TabsContent value="lyra" className="mt-4">
            <LyraProbeSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
