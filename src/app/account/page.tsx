
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setName(user.user_metadata?.name || "URLinkユーザー");
      setEmail(user.email || "");
      setLoading(false);
    }

    void loadUser();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("ログアウトに失敗しました。");
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="p-10 text-center font-bold">
        読み込み中...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="font-bold text-blue-600">
          ← URLinkに戻る
        </Link>

        <section className="mt-8 rounded-3xl bg-white p-8 shadow-md">
          <h1 className="text-3xl font-extrabold">
            アカウント情報
          </h1>

          <div className="mt-8 space-y-6">
            <div>
              <p className="text-sm text-slate-500">ユーザー名</p>
              <p className="mt-1 text-xl font-bold">{name}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                メールアドレス
              </p>
              <p className="mt-1 break-all font-bold">{email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-10 rounded-xl bg-red-500 px-6 py-3 font-bold text-white hover:bg-red-600"
          >
            ログアウト
          </button>
        </section>
      </div>
    </main>
  );
}
