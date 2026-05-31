import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, CATEGORY_LABEL, GAMES, GAME_LABEL, type CategoryValue, type GameValue } from "@/lib/constants";
import { Loader2, Save, Camera, MessageSquarePlus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PostCard, type PostWithAuthor } from "@/components/PostCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile/$userId")({
  component: ProfilePage,
});

type Profile = {
  id: string; username: string; bio: string; avatar_url: string | null;
  category: CategoryValue; games: GameValue[]; social_links: Record<string, string>;
  is_online: boolean; is_banned: boolean;
};

function ProfilePage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMe = user?.id === userId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data as Profile | null);
    setDraft(data as Profile | null);
    const { data: postData } = await supabase
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(username, avatar_url, is_online, category)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setPosts((postData ?? []) as unknown as PostWithAuthor[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const startHire = async () => {
    if (!user || !profile) return;
    if (isMe) return;
    const [a, b] = [user.id, profile.id].sort();
    const { data: existing } = await supabase.from("chats").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    let chatId = existing?.id;
    if (!chatId) {
      const { data, error } = await supabase.from("chats").insert({ user_a: a, user_b: b }).select("id").single();
      if (error) return toast.error(error.message);
      chatId = data.id;
    }
    navigate({ to: "/chat/$chatId", params: { chatId: chatId! } });
  };

  const onAvatar = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    toast.success("Avatar updated");
    load();
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      username: draft.username,
      bio: draft.bio,
      games: draft.games,
      social_links: draft.social_links,
    }).eq("id", draft.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    setEditing(false);
    load();
  };

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const social = profile.social_links ?? {};

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="glass rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="relative">
            <Avatar className="w-28 h-28 ring-4 ring-border">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl bg-surface-elevated">{profile.username.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            {profile.is_online && <span className="absolute bottom-1 right-1 w-5 h-5 bg-success rounded-full border-4 border-card" />}
            {isMe && (
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])} />
              </label>
            )}
          </div>

          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-wrap items-center gap-2">
              {editing && draft ? (
                <Input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} className="max-w-xs" />
              ) : (
                <h1 className="text-2xl font-bold">{profile.username}</h1>
              )}
              <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider">
                {CATEGORY_LABEL[profile.category]}
              </span>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                profile.is_online ? "bg-success/15 text-success" : "bg-surface-elevated text-muted-foreground")}>
                {profile.is_online ? "Online" : "Offline"}
              </span>
            </div>

            {editing && draft ? (
              <Textarea className="mt-3" rows={3} maxLength={300} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="Write a short bio…" />
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{profile.bio || "No bio yet"}</p>
            )}

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Games</p>
              {editing && draft ? (
                <div className="flex gap-2 flex-wrap">
                  {GAMES.map((g) => {
                    const active = draft.games.includes(g.value);
                    return (
                      <button key={g.value} type="button"
                        onClick={() => setDraft({ ...draft, games: active ? draft.games.filter((x) => x !== g.value) : [...draft.games, g.value] })}
                        className={cn("px-3 py-1 rounded-full text-xs font-medium border",
                          active ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-border text-muted-foreground")}>
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              ) : profile.games.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {profile.games.map((g) => (
                    <span key={g} className="px-3 py-1 rounded-full text-xs bg-surface-elevated text-foreground">{GAME_LABEL[g]}</span>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No games added</p>}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 max-w-md">
              {editing && draft ? (
                <>
                  <Input placeholder="Twitter" value={(draft.social_links?.twitter as string) ?? ""} onChange={(e) => setDraft({ ...draft, social_links: { ...draft.social_links, twitter: e.target.value } })} />
                  <Input placeholder="Discord" value={(draft.social_links?.discord as string) ?? ""} onChange={(e) => setDraft({ ...draft, social_links: { ...draft.social_links, discord: e.target.value } })} />
                </>
              ) : (
                <>
                  {social.twitter && <a className="text-sm text-primary hover:underline" href={`https://twitter.com/${String(social.twitter).replace("@","")}`} target="_blank" rel="noreferrer">Twitter: {String(social.twitter)}</a>}
                  {social.discord && <span className="text-sm text-muted-foreground">Discord: {String(social.discord)}</span>}
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {isMe ? (
                editing ? (
                  <>
                    <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground font-semibold">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Save</>}
                    </Button>
                    <Button variant="ghost" onClick={() => { setEditing(false); setDraft(profile); }}>Cancel</Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => setEditing(true)}>Edit profile</Button>
                )
              ) : (
                <Button onClick={startHire} className="gradient-primary text-primary-foreground font-semibold">
                  <MessageSquarePlus className="w-4 h-4 mr-1" /> Hire / Message
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Posts</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
