import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Users, FileText, MessageSquare, Flag, Ban, Check, Trash2, Settings as SettingsIcon, Save, AtSign } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_LABEL } from "@/lib/constants";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useSiteSettings } from "@/contexts/site-settings";
import { deleteUserAccount } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"settings" | "users" | "posts" | "reports" | "chats" | "alerts">("alerts");
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, posts: 0, online: 0, chats: 0, alerts: 0 });
  const deleteUserFn = useServerFn(deleteUserAccount);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, loading, navigate]);

  const refresh = async () => {
    const [u, p, r, c, a] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("posts").select("*, profiles!posts_user_id_fkey(username)").order("created_at", { ascending: false }),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
      supabase.from("chats").select("id, user_a, user_b, created_at, ua:profiles!chats_user_a_fkey(username), ub:profiles!chats_user_b_fkey(username)").order("created_at", { ascending: false }).limit(50),
      supabase.from("messages").select("id, chat_id, content, created_at, sender:profiles!messages_sender_id_fkey(username, avatar_url), chats:chats!messages_chat_id_fkey(user_a, user_b, ua:profiles!chats_user_a_fkey(username), ub:profiles!chats_user_b_fkey(username))").eq("mentions_admin" as never, true).order("created_at", { ascending: false }).limit(100),
    ]);
    setUsers(u.data ?? []);
    setPosts(p.data ?? []);
    setReports(r.data ?? []);
    setChats(c.data ?? []);
    setAlerts(a.data ?? []);
    setStats({
      users: u.data?.length ?? 0,
      posts: p.data?.length ?? 0,
      online: (u.data ?? []).filter((x) => x.is_online).length,
      chats: c.data?.length ?? 0,
      alerts: a.data?.length ?? 0,
    });
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  const toggleBan = async (id: string, banned: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_banned: !banned }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(banned ? "User unbanned" : "User banned");
    refresh();
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); refresh();
  };

  const deleteUser = async (id: string, username: string) => {
    if (!confirm(`Permanently delete @${username}? This cannot be undone.`)) return;
    try {
      await deleteUserFn({ data: { userId: id } });
      toast.success(`@${username} deleted`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete user");
    }
  };

  const resolveReport = async (id: string) => {
    await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
    refresh();
  };

  if (loading || !isAdmin) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const StatCard = ({ icon: Icon, label, value }: any) => (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-3"><Icon className="w-5 h-5 text-primary" /><span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span></div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Users" value={stats.users} />
        <StatCard icon={FileText} label="Posts" value={stats.posts} />
        <StatCard icon={MessageSquare} label="Chats" value={stats.chats} />
        <StatCard icon={AtSign} label="@admin alerts" value={stats.alerts} />
      </div>

      <div className="flex gap-2 mb-4 border-b border-border overflow-x-auto">
        {(["alerts","settings","users","posts","reports","chats"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize whitespace-nowrap ${tab===t?"border-primary text-foreground":"border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "alerts" ? `Alerts${stats.alerts ? ` (${stats.alerts})` : ""}` : t}
          </button>
        ))}
      </div>

      {tab === "settings" && <SiteSettingsPanel />}

      {tab === "alerts" && (
        <div className="space-y-2">
          {alerts.length === 0 && <p className="text-sm text-muted-foreground">No @admin mentions yet.</p>}
          {alerts.map((m) => (
            <div key={m.id} className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AtSign className="w-3.5 h-3.5 text-primary" />
                  <span className="font-semibold text-foreground">@{m.sender?.username ?? "user"}</span>
                  <span>in chat</span>
                  <span className="text-foreground">{m.chats?.ua?.username} ↔ {m.chats?.ub?.username}</span>
                  <span>· {new Date(m.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm mt-1 break-words">{m.content}</p>
              </div>
              <Link to="/chat/$chatId" params={{ chatId: m.chat_id }}>
                <Button size="sm" className="gradient-primary text-primary-foreground"><MessageSquare className="w-3.5 h-3.5 mr-1" /> Join chat</Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-3">User</th><th className="text-left p-3">Role</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3"><div className="flex items-center gap-2"><Avatar className="w-7 h-7"><AvatarImage src={u.avatar_url} /><AvatarFallback>{u.username.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>{u.username}</div></td>
                  <td className="p-3">{CATEGORY_LABEL[u.category as keyof typeof CATEGORY_LABEL]}</td>
                  <td className="p-3">{u.is_banned ? <span className="text-destructive">Banned</span> : u.is_online ? <span className="text-success">Online</span> : <span className="text-muted-foreground">Offline</span>}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant={u.is_banned ? "secondary" : "outline"} onClick={() => toggleBan(u.id, u.is_banned)}><Ban className="w-3 h-3 mr-1" />{u.is_banned?"Unban":"Ban"}</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteUser(u.id, u.username)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "posts" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {posts.map((p) => (
            <div key={p.id} className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">{p.profiles?.username} · {p.game}</p>
              <p className="font-semibold mt-1 line-clamp-2">{p.title}</p>
              <Button size="sm" variant="destructive" className="mt-3" onClick={() => deletePost(p.id)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
            </div>
          ))}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-2">
          {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports.</p>}
          {reports.map((r) => (
            <div key={r.id} className="glass rounded-xl p-4 flex items-center justify-between">
              <div><div className="flex items-center gap-2"><Flag className="w-4 h-4 text-destructive" /><span className="font-semibold capitalize">{r.target_type}</span><span className="text-xs text-muted-foreground">{r.status}</span></div><p className="text-sm mt-1">{r.reason}</p></div>
              {r.status === "open" && <Button size="sm" onClick={() => resolveReport(r.id)}>Resolve</Button>}
            </div>
          ))}
        </div>
      )}

      {tab === "chats" && (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Participants</th><th className="text-left p-3">Started</th></tr></thead>
            <tbody>
              {chats.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3">{c.ua?.username ?? c.user_a.slice(0,6)} ↔ {c.ub?.username ?? c.user_b.slice(0,6)}</td>
                  <td className="p-3 text-muted-foreground">{new Date(c.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SiteSettingsPanel() {
  const current = useSiteSettings();
  const [siteName, setSiteName] = useState(current.siteName);
  const [logoUrl, setLogoUrl] = useState(current.logoUrl);
  const [primaryColor, setPrimaryColor] = useState(current.primaryColor);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(firestore, "settings", "site"));
        if (snap.exists()) {
          const d = snap.data() as any;
          setSiteName(d.siteName ?? current.siteName);
          setLogoUrl(d.logoUrl ?? "");
          setPrimaryColor(d.primaryColor ?? current.primaryColor);
        }
      } catch (e) {
        console.warn("Could not load settings", e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(firestore, "settings", "site"), {
        siteName,
        logoUrl,
        primaryColor,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="glass rounded-xl p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="glass rounded-xl p-6 max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Website branding</h2>
      </div>

      <div className="space-y-2">
        <Label>Website name</Label>
        <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="My Website" />
      </div>

      <div className="space-y-2">
        <Label>Logo URL</Label>
        <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
        {logoUrl && (
          <img src={logoUrl} alt="Logo preview" className="h-12 mt-2 rounded bg-surface-elevated p-1" />
        )}
      </div>

      <div className="space-y-2">
        <Label>Primary color</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={hexFromAny(primaryColor)}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-10 w-14 rounded bg-transparent border border-border cursor-pointer"
          />
          <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#7c5cff or oklch(...)" />
        </div>
        <p className="text-xs text-muted-foreground">Accepts any CSS color (hex, hsl, oklch). Applied site-wide instantly.</p>
      </div>

      <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save settings
      </Button>
    </div>
  );
}

function hexFromAny(v: string): string {
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  return "#7c5cff";
}
