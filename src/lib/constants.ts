export const CATEGORIES = [
  { value: "player", label: "Player" },
  { value: "coach", label: "Coach" },
  { value: "team_manager", label: "Team Manager" },
  { value: "caster", label: "Caster" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export const CATEGORY_LABEL: Record<CategoryValue, string> = {
  player: "Player",
  coach: "Coach",
  team_manager: "Team Manager",
  caster: "Caster",
};

export const GAMES = [
  { value: "valorant", label: "Valorant", color: "oklch(0.65 0.22 25)" },
  { value: "lol", label: "League of Legends", color: "oklch(0.55 0.18 230)" },
  { value: "cs2", label: "CS2", color: "oklch(0.65 0.18 60)" },
  { value: "dota2", label: "Dota 2", color: "oklch(0.55 0.20 20)" },
  { value: "ow2", label: "Overwatch 2", color: "oklch(0.65 0.18 50)" },
  { value: "apex", label: "Apex Legends", color: "oklch(0.62 0.22 30)" },
  { value: "freefire", label: "Free Fire", color: "oklch(0.70 0.22 50)" },
  { value: "pubg", label: "PUBG", color: "oklch(0.68 0.16 80)" },
] as const;

export type GameValue = (typeof GAMES)[number]["value"];

export const GAME_LABEL: Record<GameValue, string> = GAMES.reduce(
  (acc, g) => ({ ...acc, [g.value]: g.label }),
  {} as Record<GameValue, string>,
);
