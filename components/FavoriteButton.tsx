//072021時13分お気に入りボタンの機能
"use client";

import { useEffect, useState } from "react";
import {
  FavoriteItem,
  isFavorite,
  removeFavorite,
  saveFavorite,
} from "../src/lib/favorites";

type FavoriteButtonProps = {
  item: FavoriteItem;
};

export default function FavoriteButton({
  item,
}: FavoriteButtonProps) {
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    function updateFavoriteState() {
      setFavorite(isFavorite(item.id));
    }

    updateFavoriteState();

    window.addEventListener(
      "favorites-updated",
      updateFavoriteState
    );

    window.addEventListener(
      "storage",
      updateFavoriteState
    );

    return () => {
      window.removeEventListener(
        "favorites-updated",
        updateFavoriteState
      );

      window.removeEventListener(
        "storage",
        updateFavoriteState
      );
    };
  }, [item.id]);

  function handleFavorite(
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    // カードのリンクが開かないようにする
    event.preventDefault();
    event.stopPropagation();

    if (favorite) {
      removeFavorite(item.id);
      setFavorite(false);
    } else {
      saveFavorite(item);
      setFavorite(true);
    }
  }

  return (
    <button
      type="button"
      onClick={handleFavorite}
      className={`rounded-lg px-3 py-2 text-sm font-extrabold transition ${
        favorite
          ? "bg-yellow-400 text-slate-950 hover:bg-yellow-500"
          : "bg-slate-200 text-slate-800 hover:bg-slate-300"
      }`}
      aria-label={
        favorite
          ? "お気に入りから解除"
          : "お気に入りに追加"
      }
    >
      {favorite
        ? "★ お気に入り済み"
        : "☆ お気に入り"}
    </button>
  );
}