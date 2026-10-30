
import { createClient } from "./supabase/client";

export type PostItem = {
  id: string;
  userId: string;
  userName: string;
  url: string;
  title: string;
  tag: string;
  category: string;
  createdAt: number;
};

type SupabasePost = {
  id: string;
  user_id: string;
  user_name: string | null;
  url: string;
  title: string;
  tag: string;
  category: string;
  created_at: string;
};

const POST_COLUMNS =
  "id, user_id, user_name, url, title, tag, category, created_at";

function toPostItem(post: SupabasePost): PostItem {
  return {
    id: post.id,
    userId: post.user_id,
    userName: post.user_name || "Unknown User",
    url: post.url,
    title: post.title,
    tag: post.tag,
    category: post.category,
    createdAt: new Date(post.created_at).getTime(),
  };
}

// 全ユーザーの公開投稿を取得
export async function getPosts(): Promise<PostItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("投稿の取得に失敗しました:", error);
    throw new Error(error.message);
  }

  return ((data ?? []) as SupabasePost[]).map(toPostItem);
}

// 自分の投稿だけ取得
export async function getMyPosts(): Promise<PostItem[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SupabasePost[]).map(toPostItem);
}

// URLを投稿
//20261030
export async function addPost(
  post: Omit<PostItem, "id" | "userId" | "userName" | "createdAt">
): Promise<PostItem> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("投稿するにはログインが必要です。");
  }

  const parsedUrl = new URL(post.url);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("HTTPまたはHTTPSのURLを入力してください。");
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
  user_name: user.user_metadata?.name || user.email || "名前未設定",
  url: parsedUrl.toString(),
  title: post.title,
  tag: post.tag,
  category: post.category,
})
    .select(POST_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  window.dispatchEvent(new Event("posts-updated"));

  return toPostItem(data as SupabasePost);
}

// 自分の投稿を削除
export async function deletePost(id: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です。");
  }

  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("投稿を削除できませんでした。");
  }

  window.dispatchEvent(new Event("posts-updated"));
}
