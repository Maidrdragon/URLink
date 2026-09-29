"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    alert("ログインしました！");

    router.push("/mypage");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">

        <Link
          href="/"
          className="mb-6 inline-block font-bold text-blue-600 hover:underline"
        >
          ← URLinkに戻る
        </Link>

        <h1 className="text-3xl font-extrabold text-slate-950">
          ログイン
        </h1>

        <p className="mt-2 text-slate-600">
          URLinkアカウントにログイン
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <div>
            <label className="mb-2 block font-bold text-slate-800">
              メールアドレス
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="example@email.com"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-4 text-slate-950 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block font-bold text-slate-800">
              パスワード
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="パスワード"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-4 text-slate-950 outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 font-bold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-4 text-lg font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <div className="mt-7 border-t pt-6 text-center">
          <p className="text-slate-600">
            アカウントを持っていませんか？
          </p>

          <Link
            href="/signup"
            className="mt-2 inline-block font-extrabold text-blue-600 hover:underline"
          >
            新規アカウントを作成
          </Link>
        </div>

      </div>
    </main>
  );
}