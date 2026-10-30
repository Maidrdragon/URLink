
// // "use client";

// // import Link from "next/link";
// // import { useEffect, useState } from "react";
// // import { useRouter } from "next/navigation";
// // import { createClient } from "../../lib/supabase/client";

// // export default function AccountPage() {
// //   const router = useRouter();
// //   const [name, setName] = useState("");
// //   const [email, setEmail] = useState("");
// //   const [loading, setLoading] = useState(true);

// //   useEffect(() => {
// //     async function loadUser() {
// //       const supabase = createClient();
// //       const { data: { user } } = await supabase.auth.getUser();

// //       if (!user) {
// //         router.replace("/login");
// //         return;
// //       }

// //       setName(user.user_metadata?.name || "URLinkユーザー");
// //       setEmail(user.email || "");
// //       setLoading(false);
// //     }

// //     void loadUser();
// //   }, [router]);

// //   async function handleLogout() {
// //     const supabase = createClient();
// //     const { error } = await supabase.auth.signOut();

// //     if (error) {
// //       alert("ログアウトに失敗しました。");
// //       return;
// //     }

// //     router.replace("/login");
// //     router.refresh();
// //   }

// //   if (loading) {
// //     return (
// //       <main className="p-10 text-center font-bold">
// //         読み込み中...
// //       </main>
// //     );
// //   }

// //   return (
// //     <main className="min-h-screen bg-slate-50 p-8">
// //       <div className="mx-auto max-w-2xl">
// //         <Link href="/" className="font-bold text-blue-600">
// //           ← URLinkに戻る
// //         </Link>

// //         <section className="mt-8 rounded-3xl bg-white p-8 shadow-md">
// //           <h1 className="text-3xl font-extrabold">
// //             アカウント情報
// //           </h1>

// //           <div className="mt-8 space-y-6">
// //             <div>
// //               <p className="text-sm text-slate-500">ユーザー名</p>
// //               <p className="mt-1 text-xl font-bold">{name}</p>
// //             </div>

// //             <div>
// //               <p className="text-sm text-slate-500">
// //                 メールアドレス
// //               </p>
// //               <p className="mt-1 break-all font-bold">{email}</p>
// //             </div>
// //           </div>

// //           <button
// //             type="button"
// //             onClick={handleLogout}
// //             className="mt-10 rounded-xl bg-red-500 px-6 py-3 font-bold text-white hover:bg-red-600"
// //           >
// //             ログアウト
// //           </button>
// //         </section>
// //       </div>
// //     </main>
// //   );
// // }
// //20261030編集時

// "use client";

// import Link from "next/link";
// import { useEffect, useState, type ChangeEvent } from "react";
// import { useRouter } from "next/navigation";
// import { createClient } from "../../lib/supabase/client";

// export default function AccountPage() {
//   const router = useRouter();

//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [avatarUrl, setAvatarUrl] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [uploading, setUploading] = useState(false);

//   useEffect(() => {
//     async function loadUser() {
//       const supabase = createClient();

//       const {
//         data: { user },
//         error,
//       } = await supabase.auth.getUser();

//       if (error || !user) {
//         router.replace("/login");
//         return;
//       }

//       setName(user.user_metadata?.name || "URLinkユーザー");
//       setEmail(user.email || "");
//       setAvatarUrl(user.user_metadata?.avatar_url || "");
//       setLoading(false);
//     }

//     void loadUser();
//   }, [router]);

//   async function handleAvatarChange(
//     event: ChangeEvent<HTMLInputElement>
//   ) {
//     const file = event.target.files?.[0];

//     if (!file) return;

//     if (!file.type.startsWith("image/")) {
//       alert("画像ファイルを選択してください。");
//       event.target.value = "";
//       return;
//     }

//     if (file.size > 5 * 1024 * 1024) {
//       alert("画像サイズは5MB以下にしてください。");
//       event.target.value = "";
//       return;
//     }

//     setUploading(true);

//     try {
//       const supabase = createClient();

//       const {
//         data: { user },
//         error: userError,
//       } = await supabase.auth.getUser();

//       if (userError || !user) {
//         alert("ログイン情報を取得できませんでした。");
//         return;
//       }

//       const extension =
//         file.name.split(".").pop()?.toLowerCase() || "jpg";

//       const filePath =
//         `${user.id}/avatar-${Date.now()}.${extension}`;

//       const { error: uploadError } = await supabase.storage
//         .from("avatars")
//         .upload(filePath, file, {
//           contentType: file.type,
//           upsert: false,
//         });

//       if (uploadError) {
//         console.error(uploadError);
//         alert("画像のアップロードに失敗しました。");
//         return;
//       }

//       const { data } = supabase.storage
//         .from("avatars")
//         .getPublicUrl(filePath);

//       const publicUrl = data.publicUrl;

//       const { error: updateError } =
//         await supabase.auth.updateUser({
//           data: { avatar_url: publicUrl },
//         });

//       if (updateError) {
//         console.error(updateError);
//         alert("プロフィール画像を保存できませんでした。");
//         return;
//       }

//       setAvatarUrl(publicUrl);
//       alert("プロフィール画像を変更しました！");
//     } catch (error) {
//       console.error(error);
//       alert("エラーが発生しました。");
//     } finally {
//       setUploading(false);
//       event.target.value = "";
//     }
//   }

//   async function handleLogout() {
//     const supabase = createClient();

//     const { error } = await supabase.auth.signOut();

//     if (error) {
//       alert("ログアウトに失敗しました。");
//       return;
//     }

//     router.replace("/login");
//     router.refresh();
//   }

//   if (loading) {
//     return (
//       <main className="p-10 text-center font-bold">
//         読み込み中...
//       </main>
//     );
//   }

//   return (
//     <main className="min-h-screen bg-slate-50 p-8">
//       <div className="mx-auto max-w-2xl">
//         <Link href="/" className="font-bold text-blue-600">
//           ← URLinkに戻る
//         </Link>

//         <section className="mt-8 rounded-3xl bg-white p-8 shadow-md">
//           <h1 className="text-3xl font-extrabold text-slate-900">
//             アカウント情報
//           </h1>

//           <div className="mt-8 flex flex-col items-center">
//             {avatarUrl ? (
//               <img
//                 src={avatarUrl}
//                 alt="プロフィール画像"
//                 className="h-32 w-32 rounded-full border-4 border-slate-200 object-cover"
//               />
//             ) : (
//               <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-200 text-slate-500">
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   viewBox="0 0 24 24"
//                   fill="currentColor"
//                   className="h-20 w-20"
//                 >
//                   <path
//                     fillRule="evenodd"
//                     d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-8 9a8 8 0 1 1 16 0H4Z"
//                     clipRule="evenodd"
//                   />
//                 </svg>
//               </div>
//             )}

//             <label
//               className={`mt-4 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white ${
//                 uploading
//                   ? "cursor-not-allowed opacity-60"
//                   : "cursor-pointer hover:bg-blue-700"
//               }`}
//             >
//               {uploading
//                 ? "アップロード中..."
//                 : "プロフィール画像を変更"}

//               <input
//                 type="file"
//                 accept="image/*"
//                 onChange={handleAvatarChange}
//                 disabled={uploading}
//                 className="hidden"
//               />
//             </label>

//             <p className="mt-2 text-sm text-slate-500">
//               画像形式・5MB以下
//             </p>
//           </div>

//           <div className="mt-8 space-y-6">
//             <div>
//               <p className="text-sm text-slate-500">ユーザー名</p>
//               <p className="mt-1 text-xl font-bold text-slate-900">
//                 {name}
//               </p>
//             </div>

//             <div>
//               <p className="text-sm text-slate-500">
//                 メールアドレス
//               </p>
//               <p className="mt-1 break-all font-bold text-slate-900">
//                 {email}
//               </p>
//             </div>
//           </div>

//           <button
//             type="button"
//             onClick={handleLogout}
//             className="mt-10 rounded-xl bg-red-500 px-6 py-3 font-bold text-white hover:bg-red-600"
//           >
//             ログアウト
//           </button>
//         </section>
//       </div>
//     </main>
//   );
// }

//20261030

"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login");
        return;
      }

      const userName =
        user.user_metadata?.name || "URLinkユーザー";

      const currentAvatar =
        user.user_metadata?.avatar_url || "";

      setName(userName);
      setEmail(user.email || "");
      setAvatarUrl(currentAvatar);

      setLoading(false);
    }

    void loadUser();
  }, [router]);

  async function handleAvatarChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください。");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("画像サイズは5MB以下にしてください。");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("ログイン情報を取得できませんでした。");
        return;
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath =
        `${user.id}/avatar-${Date.now()}.${extension}`;

      // Storageに画像をアップロード
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("画像アップロードエラー:", uploadError);
        alert("画像のアップロードに失敗しました。");
        return;
      }

      // 画像の公開URLを取得
      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Authのユーザー情報を更新
      const { error: updateError } =
        await supabase.auth.updateUser({
          data: { avatar_url: publicUrl },
        });

      if (updateError) {
        console.error("Auth更新エラー:", updateError);
        alert("プロフィール画像を保存できませんでした。");
        return;
      }

      // profilesテーブルにも保存
      const userName =
        user.user_metadata?.name || "URLinkユーザー";

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            name: userName,
            avatar_url: publicUrl,
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        console.error("profiles保存エラー:", profileError);
        alert(
          "画像はアップロードされましたが、プロフィール情報の保存に失敗しました。"
        );
        return;
      }

      setAvatarUrl(publicUrl);
      alert("プロフィール画像を変更しました！");
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました。");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

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
          <h1 className="text-3xl font-extrabold text-slate-900">
            アカウント情報
          </h1>

          <div className="mt-8 flex flex-col items-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="プロフィール画像"
                className="h-32 w-32 rounded-full border-4 border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-20 w-20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-8 9a8 8 0 1 1 16 0H4Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}

            <label
              className={`mt-4 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white ${
                uploading
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer hover:bg-blue-700"
              }`}
            >
              {uploading
                ? "アップロード中..."
                : "プロフィール画像を変更"}

              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploading}
                className="hidden"
              />
            </label>

            <p className="mt-2 text-sm text-slate-500">
              画像形式・5MB以下
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <p className="text-sm text-slate-500">
                ユーザー名
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {name}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                メールアドレス
              </p>
              <p className="mt-1 break-all font-bold text-slate-900">
                {email}
              </p>
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
