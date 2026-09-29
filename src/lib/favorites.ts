import { createClient } from "./supabase/client";

export type FavoriteItem = {
  id: string;
  service: "youtube" | "twitch";
  title: string;
  creator: string;
  thumbnail: string;
  url: string;
  gameName?: string;
  isLive?: boolean;
};

type SupabaseFavorite = {
  item_id: string;
  service: "youtube" | "twitch";
  title: string;
  creator: string;
  thumbnail: string | null;
  url: string;
  game_name: string | null;
  is_live: boolean;
};

const OLD_FAVORITES_KEY = "urlink-favorites";
const MIGRATION_KEY = "urlink-favorites-migrated";

export async function getFavorites(): Promise<FavoriteItem[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("favorites")
    .select(
      "item_id, service, title, creator, thumbnail, url, game_name, is_live"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "お気に入りの読み込みに失敗しました:",
      error
    );
    return [];
  }

  const favorites = (data ?? []) as SupabaseFavorite[];

  return favorites.map((item) => ({
    id: item.item_id,
    service: item.service,
    title: item.title,
    creator: item.creator,
    thumbnail: item.thumbnail ?? "",
    url: item.url,
    gameName: item.game_name ?? undefined,
    isLive: item.is_live,
  }));
}

export async function saveFavorite(
  item: FavoriteItem
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "お気に入りに追加するにはログインが必要です。"
    );
  }

  const { error } = await supabase
    .from("favorites")
    .upsert(
      {
        user_id: user.id,
        item_id: item.id,
        service: item.service,
        title: item.title,
        creator: item.creator,
        thumbnail: item.thumbnail,
        url: item.url,
        game_name: item.gameName ?? null,
        is_live: item.isLive ?? false,
      },
      {
        onConflict: "user_id,item_id",
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  window.dispatchEvent(
    new Event("favorites-updated")
  );
}

export async function removeFavorite(
  id: string
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("item_id", id);

  if (error) {
    throw new Error(error.message);
  }

  window.dispatchEvent(
    new Event("favorites-updated")
  );
}

export async function isFavorite(
  id: string
): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("item_id")
    .eq("user_id", user.id)
    .eq("item_id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "お気に入り確認に失敗しました:",
      error
    );
    return false;
  }

  return Boolean(data);
}

export async function migrateLocalFavorites(): Promise<number> {
  if (typeof window === "undefined") {
    return 0;
  }

  if (localStorage.getItem(MIGRATION_KEY) === "true") {
    return 0;
  }

  const savedData =
    localStorage.getItem(OLD_FAVORITES_KEY);

  if (!savedData) {
    localStorage.setItem(MIGRATION_KEY, "true");
    return 0;
  }

  let oldFavorites: FavoriteItem[];

  try {
    const parsedData = JSON.parse(savedData);

    if (!Array.isArray(parsedData)) {
      return 0;
    }

    oldFavorites = parsedData;
  } catch {
    return 0;
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  if (oldFavorites.length === 0) {
    localStorage.setItem(MIGRATION_KEY, "true");
    return 0;
  }

  const rows = oldFavorites.map((item) => ({
    user_id: user.id,
    item_id: item.id,
    service: item.service,
    title: item.title,
    creator: item.creator,
    thumbnail: item.thumbnail,
    url: item.url,
    game_name: item.gameName ?? null,
    is_live: item.isLive ?? false,
  }));

  const { error } = await supabase
    .from("favorites")
    .upsert(rows, {
      onConflict: "user_id,item_id",
    });

  if (error) {
    console.error(
      "お気に入りの移行に失敗しました:",
      error
    );
    return 0;
  }

  localStorage.setItem(MIGRATION_KEY, "true");

  window.dispatchEvent(
    new Event("favorites-updated")
  );

  return oldFavorites.length;
}