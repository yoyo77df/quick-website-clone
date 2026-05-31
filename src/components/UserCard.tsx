import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CATEGORY_LABEL, GAME_LABEL } from "@/lib/constants";
import { motion } from "framer-motion";

type ProfileLite = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  category: keyof typeof CATEGORY_LABEL;
  games: (keyof typeof GAME_LABEL)[];
  is_online: boolean;
};

export function UserCard({ profile }: { profile: ProfileLite }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Link to="/profile/$userId" params={{ userId: profile.id }} className="block group">
        <div className="glass rounded-xl p-5 hover:border-primary/40 transition-all hover:-translate-y-0.5">
          <div className="flex items-start gap-3">
            <div className="relative">
              <Avatar className="w-12 h-12 ring-2 ring-border">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="bg-surface-elevated text-foreground text-sm font-semibold">
                  {profile.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {profile.is_online && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success rounded-full border-2 border-card" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate">{profile.username}</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold uppercase tracking-wider">
                  {CATEGORY_LABEL[profile.category]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.bio || "No bio yet"}</p>
              {profile.games.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {profile.games.slice(0, 3).map((g) => (
                    <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-muted-foreground">{GAME_LABEL[g]}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
