import { createClient } from "./supabase/client";

export type Playlist = {
  id: string;
  name: string;
  createdAt: string;
};

type SupabasePlaylist = {
  id: string;
  name: string;
  created_at: string;
};

// 自分のタブ一覧を取得
export async function getPlaylists(): Promise<Playlist[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("playlists")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("タブの取得に失敗しました:", error);
    return [];
  }

  const playlists = (data ?? []) as SupabasePlaylist[];

  return playlists.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    createdAt: playlist.created_at,
  }));
}

// 新しいタブを作成
export async function createPlaylist(
  name: string
): Promise<Playlist> {
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error("タブ名を入力してください。");
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "タブを作成するにはログインが必要です。"
    );
  }

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      user_id: user.id,
      name: cleanName,
    })
    .select("id, name, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "同じ名前のタブがすでにあります。"
      );
    }

    throw new Error(error.message);
  }

  window.dispatchEvent(
    new Event("playlists-updated")
  );

  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
  };
}

// 投稿をタブに入れる
export async function addPostToPlaylist(
  postId: string,
  playlistId: string
): Promise<void> {
  if (!postId || !playlistId) {
    return;
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です。");
  }

  const { error } = await supabase
    .from("post_playlists")
    .insert({
      post_id: postId,
      playlist_id: playlistId,
    });

  if (error) {
    if (error.code === "23505") {
      return;
    }

    throw new Error(error.message);
  }

  window.dispatchEvent(
    new Event("playlists-updated")
  );
}

// タブに入っている投稿IDを取得
export async function getPlaylistPostIds(
  playlistId: string
): Promise<string[]> {
  if (!playlistId) {
    return [];
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("post_playlists")
    .select("post_id")
    .eq("playlist_id", playlistId);

  if (error) {
    console.error(
      "タブの投稿取得に失敗しました:",
      error
    );

    return [];
  }

  return (data ?? []).map(
    (item) => item.post_id as string
  );
}

// タブ名を変更
export async function renamePlaylist(
  id: string,
  newName: string
): Promise<void> {
  const cleanName = newName.trim();

  if (!cleanName) {
    throw new Error("タブ名を入力してください。");
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です。");
  }

  const { error } = await supabase
    .from("playlists")
    .update({
      name: cleanName,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "同じ名前のタブがすでにあります。"
      );
    }

    throw new Error(error.message);
  }

  window.dispatchEvent(
    new Event("playlists-updated")
  );
}

// タブを削除
export async function deletePlaylist(
  id: string
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です。");
  }

  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  window.dispatchEvent(
    new Event("playlists-updated")
  );
}