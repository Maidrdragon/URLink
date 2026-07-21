//072021時11分お気に入り機能を追加したコード
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

const FAVORITES_KEY = "urlink-favorites";

export function getFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedData = localStorage.getItem(FAVORITES_KEY);

    if (!savedData) {
      return [];
    }

    const parsedData = JSON.parse(savedData);

    if (!Array.isArray(parsedData)) {
      return [];
    }

    return parsedData;
  } catch (error) {
    console.error("お気に入りの読み込みに失敗しました:", error);
    return [];
  }
}

export function saveFavorite(item: FavoriteItem): void {
  if (typeof window === "undefined") {
    return;
  }

  const currentFavorites = getFavorites();

  const alreadyExists = currentFavorites.some(
    (favorite) => favorite.id === item.id
  );

  if (alreadyExists) {
    return;
  }

  const newFavorites = [item, ...currentFavorites];

  localStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify(newFavorites)
  );

  window.dispatchEvent(new Event("favorites-updated"));
}

export function removeFavorite(id: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const currentFavorites = getFavorites();

  const newFavorites = currentFavorites.filter(
    (favorite) => favorite.id !== id
  );

  localStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify(newFavorites)
  );

  window.dispatchEvent(new Event("favorites-updated"));
}

export function isFavorite(id: string): boolean {
  const currentFavorites = getFavorites();

  return currentFavorites.some(
    (favorite) => favorite.id === id
  );
}