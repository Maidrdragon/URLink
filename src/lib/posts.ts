import { createClient } from "./supabase/client";

export type PostItem = {
  id: string;
  url: string;
  title: string;
  tag: string;
  category: string;
  createdAt: number;
};

type SupabasePost = {
  id: string;
  url: string;
  title: string;
  tag: string;
  category: string;
  created_at: string;
};

export async function getPosts(): Promise<PostItem[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("posts")
    .select("id, url, title, tag, category, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("投稿の取得に失敗しました:", error);
    return [];
  }

  const posts = (data ?? []) as SupabasePost[];

  return posts.map((post) => ({
    id: post.id,
    url: post.url,
    title: post.title,
    tag: post.tag,
    category: post.category,
    createdAt: new Date(post.created_at).getTime(),
  }));
}

export async function addPost(
  post: Omit<PostItem, "id" | "createdAt">
): Promise<PostItem> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("投稿するにはログインが必要です。");
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      url: post.url,
      title: post.title,
      tag: post.tag,
      category: post.category,
    })
    .select("id, url, title, tag, category, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const savedPost = data as SupabasePost;

  window.dispatchEvent(new Event("posts-updated"));

  return {
    id: savedPost.id,
    url: savedPost.url,
    title: savedPost.title,
    tag: savedPost.tag,
    category: savedPost.category,
    createdAt: new Date(savedPost.created_at).getTime(),
  };
}
// 自分の投稿を削除0925
export async function deletePost(
  id: string
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "投稿を削除するにはログインが必要です。"
    );
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  window.dispatchEvent(
    new Event("posts-updated")
  );
}