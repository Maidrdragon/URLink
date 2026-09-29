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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function updateFavoriteState() {
      const result = await isFavorite(item.id);

      if (active) {
        setFavorite(result);
      }
    }

    updateFavoriteState();

    window.addEventListener(
      "favorites-updated",
      updateFavoriteState
    );

    return () => {
      active = false;

      window.removeEventListener(
        "favorites-updated",
        updateFavoriteState
      );
    };
  }, [item.id]);

  async function handleFavorite(
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    // カードのリンクが開かないようにする
    event.preventDefault();
    event.stopPropagation();

    if (loading) {
      return;
    }

    setLoading(true);

    try {
      if (favorite) {
        await removeFavorite(item.id);
        setFavorite(false);
      } else {
        await saveFavorite(item);
        setFavorite(true);
      }
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("お気に入りの操作に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleFavorite}
      disabled={loading}
      className={`rounded-lg px-3 py-2 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
      {loading
        ? "処理中..."
        : favorite
          ? "★ お気に入り済み"
          : "☆ お気に入り"}
    </button>
  );
}