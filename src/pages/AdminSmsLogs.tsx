import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import SparkleLoader from "@/components/SparkleLoader";

type SmsLog = {
  id: string;
  phone: string;
  ip: string | null;
  status: string;
  http_status: number | null;
  duration_ms: number | null;
  twilio_sid: string | null;
  twilio_status: string | null;
  twilio_error_code: string | null;
  twilio_error_message: string | null;
  request_payload: unknown;
  response_payload: unknown;
  internal_error: string | null;
  created_at: string;
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "errors", label: "Errors only" },
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
  { value: "twilio_error", label: "Twilio errors" },
  { value: "internal_error", label: "Internal errors" },
];

const isErrorStatus = (s: string) =>
  s === "twilio_error" || s === "internal_error" || s === "failed" || s === "undelivered";

const StatusBadge = ({ status }: { status: string }) => {
  if (isErrorStatus(status)) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="w-3 h-3" /> {status}
      </Badge>
    );
  }
  if (status === "queued" || status === "sending" || status === "accepted") {
    return (
      <Badge variant="secondary" className="gap-1">
        <RefreshCw className="w-3 h-3" /> {status}
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
      <CheckCircle2 className="w-3 h-3" /> {status}
    </Badge>
  );
};

const AdminSmsLogs = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sms_logs" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("Failed to load SMS logs", { description: error.message });
    } else {
      setLogs((data as unknown as SmsLog[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filter === "errors" && !isErrorStatus(l.status)) return false;
      if (filter !== "all" && filter !== "errors" && l.status !== filter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [
          l.phone,
          l.twilio_sid,
          l.twilio_error_code,
          l.twilio_error_message,
          l.internal_error,
          l.ip,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, filter]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearAll = async () => {
    if (!confirm("Delete ALL SMS logs? This cannot be undone.")) return;
    const { error } = await supabase
      .from("sms_logs" as never)
      .delete()
      .gte("created_at", "1900-01-01");
    if (error) {
      toast.error("Could not clear logs", { description: error.message });
    } else {
      toast.success("Logs cleared");
      setLogs([]);
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SparkleLoader size={36} />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const errorCount = logs.filter((l) => isErrorStatus(l.status)).length;

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">
                <ArrowLeft className="w-4 h-4 mr-1" /> Admin
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">SMS Logs</h1>
              <p className="text-sm text-muted-foreground">
                Twilio request/response details for every phone verification attempt.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={!logs.length}>
              <Trash2 className="w-4 h-4 mr-2 text-destructive" />
              Clear all
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Total (last 200)</p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Errors</p>
              <p className="text-2xl font-bold text-destructive">{errorCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Success rate</p>
              <p className="text-2xl font-bold">
                {logs.length
                  ? `${Math.round(((logs.length - errorCount) / logs.length) * 100)}%`
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search phone, Twilio SID, error..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={filter === f.value ? "default" : "outline"}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <SparkleLoader size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No SMS logs match your filters.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => {
              const isOpen = expanded.has(log.id);
              const isErr = isErrorStatus(log.status);
              return (
                <Card
                  key={log.id}
                  className={isErr ? "border-destructive/50" : ""}
                >
                  <CardHeader
                    className="cursor-pointer py-3"
                    onClick={() => toggle(log.id)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <StatusBadge status={log.status} />
                      <span className="font-mono text-sm">{log.phone}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      {log.duration_ms != null && (
                        <span className="text-xs text-muted-foreground">
                          {log.duration_ms}ms
                        </span>
                      )}
                      {log.http_status != null && (
                        <Badge variant="outline" className="text-xs">
                          HTTP {log.http_status}
                        </Badge>
                      )}
                      {log.twilio_error_code && (
                        <Badge variant="destructive" className="text-xs">
                          Twilio {log.twilio_error_code}
                        </Badge>
                      )}
                    </div>
                    {(log.twilio_error_message || log.internal_error) && !isOpen && (
                      <CardDescription className="mt-1 text-destructive line-clamp-1">
                        {log.twilio_error_message || log.internal_error}
                      </CardDescription>
                    )}
                  </CardHeader>
                  {isOpen && (
                    <CardContent className="space-y-3 text-sm">
                      <DetailRow label="Twilio SID" value={log.twilio_sid} mono />
                      <DetailRow label="Twilio status" value={log.twilio_status} />
                      <DetailRow
                        label="Twilio error code"
                        value={log.twilio_error_code}
                      />
                      <DetailRow
                        label="Twilio error message"
                        value={log.twilio_error_message}
                        wrap
                      />
                      <DetailRow
                        label="Internal error"
                        value={log.internal_error}
                        wrap
                      />
                      <DetailRow label="IP" value={log.ip} mono />
                      {log.request_payload != null && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                            Request
                          </p>
                          <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto">
                            {JSON.stringify(log.request_payload, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.response_payload != null && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                            Twilio response
                          </p>
                          <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto">
                            {JSON.stringify(log.response_payload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const DetailRow = ({
  label,
  value,
  mono,
  wrap,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  wrap?: boolean;
}) => {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground sm:w-44 shrink-0">
        {label}
      </span>
      <span
        className={`${mono ? "font-mono" : ""} ${
          wrap ? "whitespace-pre-wrap break-words" : "break-all"
        } text-sm`}
      >
        {value}
      </span>
    </div>
  );
};

export default AdminSmsLogs;