import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { Input } from "@/components/ui/input";
import { GameFilterTabs } from "@/components/GameFilterTabs";
import { PostCard, type PostWithAuthor } from "@/components/PostCard";
import { UserCard } from "@/components/UserCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES, type GameValue } from "@/lib/constants";
import { Search, Users, GraduationCap, Shield, Mic, Briefcase, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const sectionSchema = z.enum(["all", "players", "coaches", "teams", "casters", "jobs"]).optional();
const searchSchema = z.object({ section: sectionSchema });

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: searchSchema,
  component: DashboardPage,
});

type Section = "all" | "players" | "coaches" | "teams" | "casters" | "jobs";
type Filter = GameValue | "all" | "online";

const SECTIONS: { value: Section; label: string; icon: typeof Users }[] = [
  { value: "all", label: "All", icon: LayoutGrid },
  { value: "players", label: "Players", icon: Users },
  { value: "coaches", label: "Coaches", icon: GraduationCap },
  { value: "teams", label: "Teams", icon: Shield },
  { value: "casters", label: "Casters", icon: Mic },
  { value: "jobs", label: "Jobs", icon: Briefcase },
];

const SECTION_TO_CATEGORY: Record<Exclude<Section, "all" | "jobs">, typeof CATEGORIES[number]["value"]> = {
  players: "player", coaches: "coach", teams: "team_manager", casters: "caster",
};

function DashboardPage() {
  const { section: searchSection } = Route.useSearch();
  const navigate = Route.useNavigate();
  const section: Section = searchSection ?? "all";
  const { user } = useAuth();

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<PostWithAuthor[] | null>(null);
  const [profiles, setProfiles] = useState<Awaited<ReturnType<typeof fetchProfiles>> | null>(null);

  const fetchAll = async () => {
    const [{ data: postsData }, profilesData] = await Promise.all([
      supabase
        .from("posts")
        .select("*, profiles!posts_user_id_fkey(username, avatar_url, is_online, category)")
        .order("created_at", { ascending: false })
        .limit(60),
      fetchProfiles(),
    ]);
    setPosts((postsData ?? []) as unknown as PostWithAuthor[]);
    setProfiles(profilesData);
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPosts = useMemo(() => {
    if (!posts) return null;
    return posts.filter((p) => {
      if (filter === "online") { if (!p.profiles?.is_online) return false; }
      else if (filter !== "all" && p.game !== filter) return false;
      if (section !== "all" && section !== "jobs") {
        const cat = SECTION_TO_CATEGORY[section];
        if (p.profiles?.category !== cat) return false;
      }
      if (query) {
        const q = query.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q) && !p.profiles?.username.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [posts, filter, section, query]);

  const filteredProfiles = useMemo(() => {
    if (!profiles) return null;
    return profiles.filter((p) => {
      if (filter === "online") { if (!p.is_online) return false; }
      else if (filter !== "all" && !(p.games ?? []).includes(filter)) return false;
      if (section !== "all" && section !== "jobs") {
        if (p.category !== SECTION_TO_CATEGORY[section]) return false;
      }
      if (query && !p.username.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [profiles, filter, section, query]);

  const showPosts = section === "jobs" || section === "all";
  const showProfiles = section !== "jobs";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold tracking-tight">
            Discover <span className="text-gradient">esports talent</span>
          </motion.h1>
          <p className="text-sm text-muted-foreground mt-1">Players, coaches, teams and casters across every major game.</p>
        </div>
        {user && <CreatePostDialog onCreated={fetchAll} />}
      </header>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users, posts, games…" className="pl-10 bg-surface" />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-thin -mx-1 px-1 pb-2 mb-3">
        {SECTIONS.map((s) => {
          const active = section === s.value;
          return (
            <Link
              key={s.value}
              to="/dashboard"
              search={{ section: s.value === "all" ? undefined : s.value }}
              className={cn(
                "shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                active
                  ? "bg-surface-elevated border-primary text-foreground"
                  : "bg-surface border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              <s.icon className="w-4 h-4" /> {s.label}
            </Link>
          );
        })}
      </div>

      <GameFilterTabs value={filter} onChange={setFilter} />

      <div className="mt-6 space-y-8">
        {showProfiles && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {section === "all" ? "People" : SECTIONS.find((s) => s.value === section)?.label}
            </h2>
            {filteredProfiles === null ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : filteredProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one matches those filters yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProfiles.map((p) => <UserCard key={p.id} profile={p} />)}
              </div>
            )}
          </section>
        )}

        {showPosts && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {section === "jobs" ? "Jobs & Posts" : "Latest Posts"}
            </h2>
            {filteredPosts === null ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
              </div>
            ) : filteredPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No posts yet. Be the first to create one.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPosts.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

async function fetchProfiles() {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, category, games, is_online")
    .eq("is_banned", false)
    .order("is_online", { ascending: false })
    .limit(60);
  return (data ?? []) as Array<{
    id: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    category: "player" | "coach" | "team_manager" | "caster";
    games: GameValue[];
    is_online: boolean;
  }>;
}
