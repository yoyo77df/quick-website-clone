import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GAMES, type GameValue } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import { Loader2, Plus, ImageIcon } from "lucide-react";

export function CreatePostDialog({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [game, setGame] = useState<GameValue>("valorant");
  const [skill, setSkill] = useState("");
  const [availability, setAvailability] = useState("");
  const [twitter, setTwitter] = useState("");
  const [discord, setDiscord] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle(""); setDescription(""); setGame("valorant");
    setSkill(""); setAvailability(""); setTwitter(""); setDiscord(""); setFile(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    let imageUrl: string | null = null;
    try {
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("post-images").upload(path, file);
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        title, description, game,
        skill_role: skill,
        availability,
        social_links: { twitter, discord },
        image_url: imageUrl,
      });
      if (error) throw error;
      toast.success("Post created");
      setOpen(false); reset();
      onCreated?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-primary-foreground font-semibold">
          <Plus className="w-4 h-4 mr-1" /> Create Post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin bg-card">
        <DialogHeader><DialogTitle>Create a new post</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Looking for a Valorant duo (Immortal+)" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea required maxLength={1000} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell people what you offer or need…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Game</Label>
              <Select value={game} onValueChange={(v) => setGame(v as GameValue)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GAMES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Skill / Role</Label>
              <Input maxLength={60} value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Duelist, IGL…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Availability</Label>
            <Input maxLength={120} value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Evenings EU, weekends…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Twitter</Label>
              <Input maxLength={80} value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@handle" />
            </div>
            <div className="space-y-1.5">
              <Label>Discord</Label>
              <Input maxLength={80} value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="user#1234" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Image (optional)</Label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 cursor-pointer text-sm text-muted-foreground">
              <ImageIcon className="w-4 h-4" />
              {file ? file.name : "Click to upload"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground font-semibold mt-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish post"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
