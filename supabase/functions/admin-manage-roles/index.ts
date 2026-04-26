import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action =
  | { type: "search"; query: string }
  | { type: "list_roles"; user_id: string }
  | { type: "grant"; user_id: string; role: "admin" | "moderator" | "user" }
  | { type: "revoke"; user_id: string; role: "admin" | "moderator" | "user" };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization" });

    // Validate caller and confirm they are an admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Invalid session" });
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdminRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdminRow) return json(403, { error: "Admin role required" });

    const body = (await req.json()) as Action;

    if (body.type === "search") {
      const term = (body.query || "").trim();
      if (!term) return json(400, { error: "Query required" });
      const like = `%${term}%`;

      // Search profiles by display_name / username
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, created_at")
        .or(`display_name.ilike.${like},username.ilike.${like}`)
        .limit(25);

      const profileIds = new Set((profiles ?? []).map((p) => p.user_id));

      // Search auth.users by email (admin API)
      // listUsers does not support filter by email directly, so we paginate small set
      // and filter in-memory. For large projects this can be replaced with a SQL view.
      const matchesByEmail: Array<{
        user_id: string;
        email: string | null;
      }> = [];
      let page = 1;
      const perPage = 200;
      const maxPages = 5;
      const lower = term.toLowerCase();
      while (page <= maxPages) {
        const { data: list, error: listErr } = await admin.auth.admin.listUsers({
          page,
          perPage,
        });
        if (listErr) break;
        for (const u of list.users) {
          if (u.email && u.email.toLowerCase().includes(lower)) {
            matchesByEmail.push({ user_id: u.id, email: u.email });
          }
        }
        if (list.users.length < perPage) break;
        page += 1;
      }

      // Merge unique user_ids
      const allIds = new Set<string>([
        ...profileIds,
        ...matchesByEmail.map((m) => m.user_id),
      ]);

      // Fetch profile data for email-only matches
      const missingProfileIds = [...allIds].filter((id) => !profileIds.has(id));
      let extraProfiles: typeof profiles = [];
      if (missingProfileIds.length) {
        const { data } = await admin
          .from("profiles")
          .select("user_id, display_name, username, avatar_url, created_at")
          .in("user_id", missingProfileIds);
        extraProfiles = data ?? [];
      }

      const allProfiles = [...(profiles ?? []), ...extraProfiles];

      // Fetch emails for any profile match that wasn't from email search
      const emailMap = new Map<string, string | null>();
      matchesByEmail.forEach((m) => emailMap.set(m.user_id, m.email));
      const needEmails = [...allIds].filter((id) => !emailMap.has(id));
      for (const id of needEmails) {
        const { data: u } = await admin.auth.admin.getUserById(id);
        emailMap.set(id, u.user?.email ?? null);
      }

      // Fetch roles for everyone
      const { data: rolesRows } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", [...allIds]);
      const rolesMap = new Map<string, string[]>();
      (rolesRows ?? []).forEach((r) => {
        const arr = rolesMap.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesMap.set(r.user_id, arr);
      });

      const results = [...allIds].map((id) => {
        const p = allProfiles.find((x) => x.user_id === id);
        return {
          user_id: id,
          email: emailMap.get(id) ?? null,
          display_name: p?.display_name ?? null,
          username: p?.username ?? null,
          avatar_url: p?.avatar_url ?? null,
          created_at: p?.created_at ?? null,
          roles: rolesMap.get(id) ?? [],
        };
      });

      return json(200, { results });
    }

    if (body.type === "list_roles") {
      const { data, error } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", body.user_id);
      if (error) return json(400, { error: error.message });
      return json(200, { roles: (data ?? []).map((r) => r.role) });
    }

    if (body.type === "grant") {
      if (!["admin", "moderator", "user"].includes(body.role))
        return json(400, { error: "Invalid role" });
      const { error } = await admin
        .from("user_roles")
        .insert({ user_id: body.user_id, role: body.role });
      if (error && !error.message.includes("duplicate"))
        return json(400, { error: error.message });
      return json(200, { ok: true });
    }

    if (body.type === "revoke") {
      // Prevent caller from accidentally revoking their own admin and locking out
      if (body.user_id === callerId && body.role === "admin") {
        // Check there is at least one other admin
        const { count } = await admin
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");
        if ((count ?? 0) <= 1)
          return json(400, {
            error: "Cannot revoke the last remaining admin role",
          });
      }
      const { error } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", body.user_id)
        .eq("role", body.role);
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});