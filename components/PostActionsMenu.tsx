
"use client";

import { useState } from "react";
import FavoriteButton from "./FavoriteButton";
import type { FavoriteItem } from "../src/lib/favorites";
import {
  addPostToPlaylist,
  type Playlist,
} from "../src/lib/playlists";

type PostActionsMenuProps = {
  postId: string;
  url: string;
  playlists: Playlist[];
  favoriteItem?: FavoriteItem;
  onDelete?: () => void;
};

export default function PostActionsMenu({
  postId,
  url,
  playlists,
  favoriteItem,
  onDelete,
}: PostActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(url);
      window.alert("投稿URLをコピーしました。");
    } catch {
      window.alert("URLをコピーできませんでした。");
    } finally {
      setOpen(false);
    }
  }

  async function handleAddToPlaylist(playlistId: string) {
    if (adding) return;

    setAdding(true);

    try {
      await addPostToPlaylist(postId, playlistId);
      window.alert("プレイリストに追加しました。");
      setPlaylistOpen(false);
      setOpen(false);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "プレイリストに追加できませんでした。"
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="relative">
      {/* 三点メニューボタン */}
      <button
        type="button"
        aria-label="投稿メニュー"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#444444] bg-[#272727]/95 text-2xl font-bold text-white shadow-md transition hover:bg-[#3A3A3A]"
      >
        ⋮
      </button>

      {/* メニュー本体 */}
      {open && (
        <div className="absolute right-0 top-11 z-30 w-56 rounded-xl border border-[#383838] bg-[#212121] p-2 shadow-2xl">

          {/* リンクをコピー */}
          <button
            type="button"
            onClick={() => void handleShare()}
            className="w-full rounded-lg px-3 py-3 text-left text-sm font-bold text-[#EEEEEE] transition hover:bg-[#383838]"
          >
            リンクをコピー
          </button>

          {/* お気に入り */}
          {favoriteItem && (
            <div className="border-t border-[#383838] px-2 py-2 text-white">
              <FavoriteButton item={favoriteItem} />
            </div>
          )}

          {/* プレイリストに追加 */}
          <button
            type="button"
            onClick={() => setPlaylistOpen((value) => !value)}
            className="w-full rounded-lg px-3 py-3 text-left text-sm font-bold text-[#EEEEEE] transition hover:bg-[#383838]"
          >
            ＋ プレイリストに追加
          </button>

          {/* プレイリスト一覧 */}
          {playlistOpen && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-[#383838] bg-[#181818] p-2">
              {playlists.length === 0 ? (
                <p className="px-2 py-3 text-xs font-semibold text-[#AAAAAA]">
                  プレイリストがありません。
                </p>
              ) : (
                playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    disabled={adding}
                    onClick={() =>
                      void handleAddToPlaylist(playlist.id)
                    }
                    className="w-full truncate rounded-lg px-3 py-2 text-left text-sm font-bold text-[#DDDDDD] transition hover:bg-[#383838] hover:text-white disabled:opacity-50"
                  >
                    {playlist.name}
                  </button>
                ))
              )}
            </div>
          )}

          {/* 自分の投稿だけ削除 */}
          {onDelete && (
            <>
              <div className="my-1 border-t border-[#383838]" />

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="w-full rounded-lg px-3 py-3 text-left text-sm font-bold text-[#FF7777] transition hover:bg-[#3A2525]"
              >
                🗑 
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
