
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPlaylist } from "../src/lib/playlists";

export default function Sidebar() {
  const pathname = usePathname();

  const [showCreate, setShowCreate] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreatePlaylist() {
    const name = playlistName.trim();

    if (!name) {
      alert("プレイリスト名を入力してください。");
      return;
    }

    if (creating) return;

    try {
      setCreating(true);

      await createPlaylist(name);

      window.dispatchEvent(new Event("playlists-updated"));

      setPlaylistName("");
      setShowCreate(false);

      alert("プレイリストを作成しました！");
    } catch (error) {
      console.error("プレイリスト作成エラー:", error);

      alert(
        error instanceof Error
          ? error.message
          : "プレイリストの作成に失敗しました。"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <nav className="mb-6 space-y-2 font-sans">
      <Link
        href="/"
        className={`block rounded-xl px-4 py-3 text-base font-semibold transition ${
          pathname === "/"
            ? "bg-[#505050] text-white"
            : "text-[#DDDDDD] hover:bg-[#505050] hover:text-white"
        }`}
      >
        ホーム
      </Link>

      <Link
        href="/mypage"
        className={`block rounded-xl px-4 py-3 text-base font-semibold transition ${
          pathname === "/mypage"
            ? "bg-[#505050] text-white"
            : "text-[#DDDDDD] hover:bg-[#505050] hover:text-white"
        }`}
      >
        マイページ
      </Link>

      <button
        type="button"
        onClick={() => {
          setPlaylistName("");
          setShowCreate(true);
        }}
        className="block w-full rounded-xl border border-dashed border-[#777777] px-4 py-3 text-left text-base font-semibold text-[#DDDDDD] transition hover:bg-[#505050] hover:text-white"
      >
        ＋ プレイリスト追加
      </button>

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#555555] bg-[#424242] p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-extrabold text-[#EEEEEE]">
              プレイリストを追加
            </h2>

            <label
              htmlFor="sidebar-playlist-name"
              className="mb-2 block text-sm font-bold text-[#DDDDDD]"
            >
              プレイリスト名
            </label>

            <input
              id="sidebar-playlist-name"
              type="text"
              value={playlistName}
              onChange={(event) =>
                setPlaylistName(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleCreatePlaylist();
                }
              }}
              placeholder="例：アニメ、ゲーム、音楽"
              maxLength={30}
              autoFocus
              className="w-full rounded-xl border border-[#666666] bg-[#505050] px-4 py-3 font-semibold text-[#EEEEEE] outline-none placeholder:text-[#AAAAAA] focus:border-[#AAAAAA] focus:ring-2 focus:ring-[#777777]"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={creating}
                onClick={() => setShowCreate(false)}
                className="rounded-sm bg-[#505050] px-5 py-3 font-bold text-[#EEEEEE] transition hover:bg-[#606060] disabled:opacity-50"
              >
                キャンセル
              </button>

              <button
                type="button"
                disabled={creating}
                onClick={() => void handleCreatePlaylist()}
                className="rounded-sm bg-[#707070] px-5 py-3 font-bold text-white transition hover:bg-[#808080] disabled:opacity-50"
              >
                {creating ? "作成中..." : "作成する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
