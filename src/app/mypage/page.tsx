//0720お気に入りボタンの機能新規追加コード
"use client";

import { useEffect, useState } from "react";
import {
  FavoriteItem,
  getFavorites,
  removeFavorite,
} from "../../lib/favorites";

export default function MyPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  function loadFavorites() {
    setFavorites(getFavorites());
  }

  useEffect(() => {
    loadFavorites();

    window.addEventListener(
      "favorites-updated",
      loadFavorites
    );

    return () => {
      window.removeEventListener(
        "favorites-updated",
        loadFavorites
      );
    };
  }, []);

  function deleteFavorite(id: string) {
    removeFavorite(id);
    loadFavorites();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">

        <h1 className="mb-8 text-4xl font-extrabold text-slate-900">
          ⭐ マイページ
        </h1>

        {favorites.length === 0 && (
          <div className="rounded-xl bg-white p-10 shadow">
            <p className="text-lg font-bold text-slate-700">
              お気に入りはまだありません。
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">

          {favorites.map((item) => (

            <div
              key={item.id}
              className="overflow-hidden rounded-2xl bg-white shadow"
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                className="aspect-video w-full object-cover"
              />

              <div className="p-4">

                <span
                  className={`rounded px-2 py-1 text-xs font-bold text-white ${
                    item.service === "youtube"
                      ? "bg-red-600"
                      : "bg-purple-700"
                  }`}
                >
                  {item.service.toUpperCase()}
                </span>

                <h2 className="mt-3 line-clamp-2 text-lg font-extrabold">
                  {item.title}
                </h2>

                <p className="mt-2 font-semibold text-slate-600">
                  {item.creator}
                </p>

                {item.gameName && (
                  <p className="text-sm text-slate-500">
                    {item.gameName}
                  </p>
                )}

                <div className="mt-5 flex gap-2">

                  <a
                    href={item.url}
                    target="_blank"
                    className="flex-1 rounded-lg bg-blue-600 py-2 text-center font-bold text-white hover:bg-blue-700"
                  >
                    開く
                  </a>

                  <button
                    onClick={() =>
                      deleteFavorite(item.id)
                    }
                    className="rounded-lg bg-red-600 px-4 font-bold text-white hover:bg-red-700"
                  >
                    削除
                  </button>

                </div>

              </div>
            </div>

          ))}

        </div>

      </div>
    </main>
  );
}