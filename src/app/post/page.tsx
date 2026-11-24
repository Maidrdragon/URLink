
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { addPost } from "../../lib/posts";
import {
  Playlist,
  addPostToPlaylist,
  createPlaylist,
  getPlaylists,
} from "../../lib/playlists";

export default function PostPage() {
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [category, setCategory] = useState("動画");

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [loading, setLoading] = useState(false);

  // マイリストを取得
  useEffect(() => {
    async function loadPlaylists() {
      try {
        const data = await getPlaylists();
        setPlaylists(data);
      } catch (error) {
        console.error("タブの取得に失敗しました:", error);
      }
    }

    void loadPlaylists();
  }, []);

  // 新しいタブを作成
  async function handleCreatePlaylist() {
    const name = newPlaylistName.trim();

    if (!name) {
      alert("新しいタブ名を入力してください。");
      return;
    }

    setCreatingPlaylist(true);

    try {
      const newPlaylist = await createPlaylist(name);

      setPlaylists((current) => [...current, newPlaylist]);
      setSelectedPlaylistId(newPlaylist.id);
      setNewPlaylistName("");
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "タブの作成に失敗しました。"
      );
    } finally {
      setCreatingPlaylist(false);
    }
  }

  // 投稿
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!url.trim() || !title.trim()) {
      alert("URLとタイトルを入力してください。");
      return;
    }

    const finalTags = [
      ...new Set(
        tagInput
          .split(/[\s、,，]+/)
          .map((tag) => tag.trim().replace(/^#+/, ""))
          .filter(Boolean)
      ),
    ];

    const formattedTags = finalTags
      .map((tag) => `#${tag}`)
      .join(",");

    setLoading(true);

    try {
      const newPost = await addPost({
        url: url.trim(),
        title: title.trim(),
        tag: formattedTags,
        category,
      });

      if (selectedPlaylistId) {
        await addPostToPlaylist(
          newPost.id,
          selectedPlaylistId
        );
      }

      alert("投稿しました！");

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "投稿に失敗しました。"
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[#666666] bg-[#505050] px-4 py-3 font-semibold text-[#EEEEEE] outline-none transition placeholder:text-[#AAAAAA] focus:border-[#AAAAAA] focus:ring-2 focus:ring-[#777777]";

  const labelClass =
    "mb-2 block font-extrabold text-[#EEEEEE]";

  return (
    <main className="min-h-screen bg-[#303030] px-4 py-10 font-sans">
      <div className="mx-auto max-w-xl rounded-xl border border-[#555555] bg-[#424242] p-7 shadow-lg">

        <div className="mb-7">
          <h1 className="text-3xl font-extrabold text-[#EEEEEE]">
            ＋ 新しい投稿
          </h1>

          <p className="mt-2 font-semibold text-[#BBBBBB]">
            URLを登録してURLinkに保存します
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* URL */}
          <div>
            <label className={labelClass}>
              URL
            </label>

            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              required
              className={inputClass}
            />
          </div>

          {/* タイトル */}
          <div>
            <label className={labelClass}>
              タイトル
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="タイトルを入力"
              required
              className={inputClass}
            />
          </div>

          {/* タグ */}
          <div>
            <label className={labelClass}>
              タグ
            </label>

            <input
              type="text"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder="例：獨協大学 経済学部 4年生"
              className={inputClass}
            />

            <p className="mt-2 text-sm font-semibold leading-6 text-[#BBBBBB]">
              半角スペース・全角スペース・「、」「,」で区切ると複数のタグを登録できます。
              投稿すると各タグの先頭に # が付きます。
            </p>
          </div>

          {/* カテゴリー */}
          <div>
            <label className={labelClass}>
              カテゴリー
            </label>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="動画">動画</option>
              <option value="ショート">ショート</option>
              <option value="配信予定">配信予定</option>
              <option value="配信中">配信中</option>
              <option value="アーカイブ">アーカイブ</option>
              <option value="クリップ">クリップ</option>
              <option value="ニュース">ニュース</option>
            </select>
          </div>

          {/* マイリスト */}
          <div className="rounded-xl border border-[#555555] bg-[#383838] p-5">
            <label className="block font-extrabold text-[#EEEEEE]">
              保存するタブ
            </label>

            <p className="mt-1 text-sm font-semibold leading-6 text-[#BBBBBB]">
              アニメ・ゲーム・音楽など、
              自分で作ったタブを選べます。
            </p>

            <select
              value={selectedPlaylistId}
              onChange={(event) =>
                setSelectedPlaylistId(event.target.value)
              }
              className={`${inputClass} mt-4 cursor-pointer`}
            >
              <option value="">タブを選択しない</option>

              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>

            <div className="mt-5 border-t border-[#555555] pt-5">
              <p className="mb-2 text-sm font-extrabold text-[#EEEEEE]">
                ＋ 新しいタブを作る
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(event) =>
                    setNewPlaylistName(event.target.value)
                  }
                  placeholder="例：アニメ"
                  className={`min-w-0 flex-1 ${inputClass}`}
                />

                <button
                  type="button"
                  onClick={handleCreatePlaylist}
                  disabled={creatingPlaylist}
                  className="rounded-xl bg-[#606060] px-5 py-3 font-extrabold text-white transition hover:bg-[#707070] disabled:opacity-50"
                >
                  {creatingPlaylist ? "作成中..." : "作成"}
                </button>
              </div>
            </div>
          </div>

          {/* 投稿 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#606060] px-5 py-4 text-lg font-extrabold text-white transition hover:bg-[#707070] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "投稿中..." : "投稿する"}
          </button>

        </form>
      </div>
    </main>
  );
}
