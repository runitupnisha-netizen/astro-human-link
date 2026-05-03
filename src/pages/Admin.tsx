import { useEffect, useMemo, useState } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Shield, Users, AlertTriangle, Crown, Telescope, Sparkles, Loader2, MessageCircleQuestion, Check, X, UserCog, ShieldCheck, ShieldOff, Copy, ExternalLink } from "lucide-react";

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
    const daysStr = window.prompt("Grant how many days of Pro? (e.g. 30, 90, 365)", "30");
    if (!daysStr) return;
    const days = parseInt(daysStr, 10);
    if (!Number.isFinite(days) || days <= 0 || days > 3650) {
      toast.error("Enter a number between 1 and 3650.");
      return;
    }
    // Extend (not overwrite) bonus_pro_until from the greater of now / existing.
    const { data: existing } = await supabase
      .from("profiles")
      .select("bonus_pro_until")
      .eq("user_id", userId)
      .maybeSingle();
    const base = existing?.bonus_pro_until && new Date(existing.bonus_pro_until) > new Date()
      ? new Date(existing.bonus_pro_until)
      : new Date();
    const newUntil = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    const { error } = await supabase
      .from("profiles")
      .update({ bonus_pro_until: newUntil.toISOString() })
      .eq("user_id", userId);
    if (error) return toast.error(`Grant failed: ${error.message}`);
    toast.success(`Granted ${days} days of Pro (until ${newUntil.toLocaleDateString()})`);
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

type LyraProbeResult = {
  ok: true;
  demo_user_id: string;
  demo_email: string;
  question: string;
  match_word: string;
  first_sentence: string;
  full_response: string;
  contains_match_word: boolean;
  first_sentence_contains_match_word: boolean;
  profile_signs: {
    sun: string | null;
    moon: string | null;
    rising: string | null;
    venus: string | null;
    mars: string | null;
    mercury: string | null;
  };
};

const DEFAULT_LYRA_QUESTION =
  "What does my Venus sign say about how I love?";

const LyraProbeLinkBanner = () => {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/admin/lyra`
      : "/admin/lyra";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lyra Probe link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-lg border-2 border-violet-300 bg-violet-50">
      <div className="flex items-center gap-2 text-sm font-semibold text-violet-900 shrink-0">
        <MessageCircleQuestion className="w-4 h-4" />
        Lyra Probe link:
      </div>
      <code className="flex-1 px-2 py-1.5 rounded bg-white border border-violet-200 text-xs text-slate-700 truncate">
        {url}
      </code>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 border-violet-300 bg-white text-violet-800 hover:bg-violet-100"
          onClick={copy}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button asChild size="sm" className="h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
          <a href="/admin/lyra" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </a>
        </Button>
      </div>
    </div>
  );
};

const LyraProbeSection = () => {
  const [question, setQuestion] = useState(DEFAULT_LYRA_QUESTION);
  const [matchWord, setMatchWord] = useState("Sagittarius");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<LyraProbeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "admin-lyra-probe",
        { body: { question, matchWord } },
      );
      if (invokeErr) throw invokeErr;
      const payload = data as LyraProbeResult | { error: string };
      if ("error" in payload) throw new Error(payload.error);
      setResult(payload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`Lyra probe failed: ${msg}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="bg-white border-slate-200 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-violet-100 text-violet-700">
          <MessageCircleQuestion className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">
            Lyra Probe
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Calls the cosmic-guide AI prompt server-side using the demo
            account's saved blueprint, then surfaces the first sentence and
            checks for an expected keyword (e.g. <code>Sagittarius</code>).
            Preview-only — admin role required.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr,180px] gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Question</label>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask Lyra anything…"
            disabled={running}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">
            Expect keyword
          </label>
          <Input
            value={matchWord}
            onChange={(e) => setMatchWord(e.target.value)}
            placeholder="Sagittarius"
            disabled={running}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={run} disabled={running || !question.trim()}>
          {running ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              Asking Lyra…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Run Lyra Probe
            </>
          )}
        </Button>
        <button
          type="button"
          className="text-xs text-slate-500 hover:text-slate-800"
          onClick={() => {
            setQuestion(DEFAULT_LYRA_QUESTION);
            setMatchWord("Sagittarius");
            setResult(null);
            setError(null);
          }}
        >
          Reset
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            <div className="text-slate-600">
              <span className="text-slate-400">Demo user:</span>{" "}
              <code className="text-slate-800">{result.demo_email}</code>
            </div>
            <div className="text-slate-600">
              <span className="text-slate-400">Signs used:</span>{" "}
              <code className="text-slate-800">
                ☉ {result.profile_signs.sun ?? "—"} · ☽{" "}
                {result.profile_signs.moon ?? "—"} · ↗{" "}
                {result.profile_signs.rising ?? "—"}
              </code>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              First sentence
            </div>
            <p className="text-sm text-slate-900 leading-relaxed">
              {result.first_sentence || "(empty)"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${
                result.first_sentence_contains_match_word
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-amber-300 bg-amber-50 text-amber-800"
              }`}
            >
              {result.first_sentence_contains_match_word ? (
                <Check className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3" />
              )}
              "{result.match_word}" in 1st sentence
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${
                result.contains_match_word
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-rose-300 bg-rose-50 text-rose-800"
              }`}
            >
              {result.contains_match_word ? (
                <Check className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3" />
              )}
              "{result.match_word}" anywhere in response
            </span>
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-slate-500 hover:text-slate-800">
              Full response
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-slate-700 bg-slate-50 rounded-md p-3 border border-slate-200 max-h-96 overflow-auto">
              {result.full_response}
            </pre>
          </details>
        </div>
      )}
    </Card>
  );
};

type RoleUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string | null;
  roles: string[];
};

const ROLE_OPTIONS: Array<"admin" | "moderator"> = ["admin", "moderator"];

const RolesSection = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RoleUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-roles", {
        body: { type: "search", query: query.trim() },
      });
      if (error) throw error;
      const payload = data as { results?: RoleUser[]; error?: string };
      if (payload.error) throw new Error(payload.error);
      setResults(payload.results ?? []);
    } catch (e) {
      toast.error(`Search failed: ${(e as Error).message}`);
    } finally {
      setSearching(false);
    }
  };

  const toggleRole = async (
    user: RoleUser,
    role: "admin" | "moderator",
    grant: boolean,
  ) => {
    const key = `${user.user_id}:${role}`;
    setBusyKey(key);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-roles", {
        body: { type: grant ? "grant" : "revoke", user_id: user.user_id, role },
      });
      if (error) throw error;
      const payload = data as { ok?: boolean; error?: string };
      if (payload.error) throw new Error(payload.error);
      toast.success(`${grant ? "Granted" : "Revoked"} ${role}`);
      setResults((prev) =>
        prev.map((u) =>
          u.user_id === user.user_id
            ? {
                ...u,
                roles: grant
                  ? Array.from(new Set([...u.roles, role]))
                  : u.roles.filter((r) => r !== role),
              }
            : u,
        ),
      );
    } catch (e) {
      toast.error(`${grant ? "Grant" : "Revoke"} failed: ${(e as Error).message}`);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Card className="bg-white border-slate-200 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-indigo-100 text-indigo-700">
          <UserCog className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">Roles &amp; permissions</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Search by email, display name, or @username. Grant or revoke admin and moderator
            access. Changes are written to <code>user_roles</code> server-side.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search by email, name, or @username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          disabled={searching}
        />
        <Button onClick={search} disabled={searching || !query.trim()}>
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Search className="w-4 h-4 mr-1" />
          )}
          Search
        </Button>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          {searching ? "Searching…" : "Enter an email, name, or @username to begin."}
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((u) => (
            <Card
              key={u.user_id}
              className="p-3 bg-white border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                {u.avatar_url && (
                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {u.display_name || u.username || u.email || u.user_id.slice(0, 8)}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {u.email ?? "—"}
                  {u.username ? ` · @${u.username}` : ""}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {u.roles.length === 0 ? (
                    <Badge variant="outline" className="text-xs">No special roles</Badge>
                  ) : (
                    u.roles.map((r) => (
                      <Badge
                        key={r}
                        className={
                          r === "admin"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : r === "moderator"
                              ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                              : "bg-slate-100 text-slate-700 border-slate-300"
                        }
                        variant="outline"
                      >
                        {r}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                {ROLE_OPTIONS.map((role) => {
                  const has = u.roles.includes(role);
                  const key = `${u.user_id}:${role}`;
                  const busy = busyKey === key;
                  return (
                    <Button
                      key={role}
                      size="sm"
                      variant={has ? "outline" : "default"}
                      className="h-8 text-xs gap-1"
                      disabled={busy}
                      onClick={() => toggleRole(u, role, !has)}
                    >
                      {busy ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : has ? (
                        <ShieldOff className="w-3 h-3" />
                      ) : (
                        <ShieldCheck className="w-3 h-3" />
                      )}
                      {has ? `Revoke ${role}` : `Grant ${role}`}
                    </Button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};

const Admin = () => {
  const { isAdmin, loading } = useIsAdmin();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [recomputing, setRecomputing] = useState(false);
  const isLyraProbeRoute = location.pathname === "/admin/lyra";

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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Checking permissions…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/sign-in?redirect=/admin" replace />;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-6 bg-white border-slate-200 text-center space-y-3">
          <Shield className="w-8 h-8 text-slate-400 mx-auto" />
          <h1 className="text-lg font-semibold text-slate-900">Admin access required</h1>
          <p className="text-sm text-slate-600">
            You're signed in as <code className="text-slate-800">{user.email}</code>, but this account does not have the admin role.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-100"
          >
            Back to app
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-slate-700" />
            <h1 className="text-xl font-semibold">Stellara Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/lyra"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 transition-colors font-semibold"
            >
              <MessageCircleQuestion className="w-3.5 h-3.5" />
              Run Lyra Probe
            </Link>
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
            <Link
              to="/admin/sms-logs"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Telescope className="w-3.5 h-3.5" />
              SMS Logs
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6">
        {isLyraProbeRoute && (
          <Link
            to="/admin"
            className="inline-flex mb-4 text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to Admin
          </Link>
        )}
        <LyraProbeLinkBanner />
        <div className="mb-6 ring-4 ring-violet-400 rounded-lg shadow-lg shadow-violet-200/60">
          <LyraProbeSection />
        </div>
        {!isLyraProbeRoute && <MetricsSection />}
        {!isLyraProbeRoute && (
        <Tabs defaultValue="reports">
          <TabsList className="bg-white border border-slate-200 h-auto flex flex-wrap justify-start gap-1 p-1">
            <TabsTrigger value="reports">Reports Queue</TabsTrigger>
            <TabsTrigger value="users">User Lookup</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>
          <TabsContent value="reports" className="mt-4">
            <Card className="bg-white border-slate-200">
              <ReportsSection />
            </Card>
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UserLookupSection />
          </TabsContent>
          <TabsContent value="roles" className="mt-4">
            <RolesSection />
          </TabsContent>
        </Tabs>
        )}
      </main>
    </div>
  );
};

export default Admin;
