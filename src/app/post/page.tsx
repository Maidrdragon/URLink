"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
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
  const [tag, setTag] = useState("");
  const [category, setCategory] =
    useState("動画");

  const [playlists, setPlaylists] = useState<
    Playlist[]
  >([]);

  const [selectedPlaylistId, setSelectedPlaylistId] =
    useState("");

  const [newPlaylistName, setNewPlaylistName] =
    useState("");

  const [creatingPlaylist, setCreatingPlaylist] =
    useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadPlaylists() {
      const data = await getPlaylists();
      setPlaylists(data);
    }

    void loadPlaylists();
  }, []);

  async function handleCreatePlaylist() {
    const name = newPlaylistName.trim();

    if (!name) {
      alert("新しいタブ名を入力してください。");
      return;
    }

    setCreatingPlaylist(true);

    try {
      const newPlaylist =
        await createPlaylist(name);

      setPlaylists((current) => [
        ...current,
        newPlaylist,
      ]);

      // 作ったタブを自動で選択
      setSelectedPlaylistId(newPlaylist.id);

      setNewPlaylistName("");
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("タブの作成に失敗しました。");
      }
    } finally {
      setCreatingPlaylist(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!url.trim() || !title.trim()) {
      alert(
        "URLとタイトルを入力してください。"
      );
      return;
    }

    setLoading(true);

    try {
const newPost = await addPost({
  url: url.trim(),
  title: title.trim(),
  tag: tag.trim(),
  category,
  userName: "ユーザー名",
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

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("投稿に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-7 shadow-lg">
        <div className="mb-7">
          <h1 className="text-3xl font-extrabold text-slate-950">
            ＋ 新しい投稿
          </h1>

          <p className="mt-2 font-semibold text-slate-600">
            URLを登録してURLinkに保存します
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* URL */}
          <div>
            <label className="mb-2 block font-extrabold text-slate-900">
              URL
            </label>

            <input
              type="url"
              value={url}
              onChange={(event) =>
                setUrl(event.target.value)
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* タイトル */}
          <div>
            <label className="mb-2 block font-extrabold text-slate-900">
              タイトル
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="タイトルを入力"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* タグ */}
          <div>
            <label className="mb-2 block font-extrabold text-slate-900">
              タグ
            </label>

            <input
              type="text"
              value={tag}
              onChange={(event) =>
                setTag(event.target.value)
              }
              placeholder="例：まどマギ"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 固定カテゴリー */}
          <div>
            <label className="mb-2 block font-extrabold text-slate-900">
              カテゴリー
            </label>

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="動画">
                動画
              </option>

              <option value="ショート">
                ショート
              </option>

              <option value="配信予定">
                配信予定
              </option>

              <option value="配信中">
                配信中
              </option>

              <option value="アーカイブ">
                アーカイブ
              </option>

              <option value="クリップ">
                クリップ
              </option>

              <option value="ニュース">
                ニュース
              </option>
            </select>
          </div>

          {/* マイリスト */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <label className="block font-extrabold text-slate-950">
               保存するタブ
            </label>

            <p className="mt-1 text-sm font-semibold text-slate-600">
              アニメ・ゲーム・音楽など、
              自分で作ったタブを選べます。
            </p>

            <select
              value={selectedPlaylistId}
              onChange={(event) =>
                setSelectedPlaylistId(
                  event.target.value
                )
              }
              className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold outline-none focus:border-blue-500"
            >
              <option value="">
                タブを選択しない
              </option>

              {playlists.map((playlist) => (
                <option
                  key={playlist.id}
                  value={playlist.id}
                >
                  {playlist.name}
                </option>
              ))}
            </select>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <p className="mb-2 text-sm font-extrabold text-slate-800">
                ＋ 新しいタブを作る
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(event) =>
                    setNewPlaylistName(
                      event.target.value
                    )
                  }
                  placeholder="例：アニメ"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={
                    handleCreatePlaylist
                  }
                  disabled={creatingPlaylist}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-extrabold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {creatingPlaylist
                    ? "作成中..."
                    : "作成"}
                </button>
              </div>
            </div>
          </div>

          {/* 投稿 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-500 px-5 py-4 text-lg font-extrabold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "投稿中..."
              : "投稿する"}
          </button>
        </form>
      </div>
    </main>
  );
}