// import { NextResponse } from "next/server";

// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url);

//   const q = searchParams.get("q");

//   if (!q) {
//     return NextResponse.json([]);
//   }

//   const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

//   const url =
//     `https://www.googleapis.com/youtube/v3/search` +
//     `?part=snippet` +
//     `&maxResults=12` +
//     `&q=${encodeURIComponent(q)}` +
//     `&type=video` +
//     `&key=${API_KEY}`;

//   const res = await fetch(url);

//   const data = await res.json();

//   return NextResponse.json(data.items);
// }
//上記はパネルが二つのyoutubeとtwitchで分かれてたコード正しく処理できた
//072111時54分に変更
// import { NextResponse } from "next/server";

// type YouTubeSearchResponse = {
//   items?: unknown[];
//   nextPageToken?: string;
//   error?: {
//     message?: string;
//   };
// };

// export async function GET(request: Request) {
//   try {
//     const { searchParams } = new URL(request.url);

//     const keyword = searchParams.get("q")?.trim();
//     const pageToken = searchParams.get("pageToken")?.trim();

//     if (!keyword) {
//       return NextResponse.json(
//         {
//           items: [],
//           nextPageToken: null,
//         }
//       );
//     }

//     const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

//     if (!apiKey) {
//       return NextResponse.json(
//         {
//           error: "YouTube APIキーが設定されていません。",
//         },
//         { status: 500 }
//       );
//     }

//     const params = new URLSearchParams({
//       part: "snippet",
//       q: keyword,
//       type: "video",
//       maxResults: "12",
//       key: apiKey,
//     });

//     // 2ページ目以降を取得するときだけ追加
//     if (pageToken) {
//       params.set("pageToken", pageToken);
//     }

//     const youtubeResponse = await fetch(
//       `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
//       {
//         cache: "no-store",
//       }
//     );

//     const youtubeData =
//       (await youtubeResponse.json()) as YouTubeSearchResponse;

//     if (!youtubeResponse.ok) {
//       console.error("YouTube APIエラー:", youtubeData);

//       return NextResponse.json(
//         {
//           error:
//             youtubeData.error?.message ??
//             "YouTube検索に失敗しました。",
//         },
//         { status: youtubeResponse.status }
//       );
//     }

//     return NextResponse.json({
//       items: youtubeData.items ?? [],
//       nextPageToken: youtubeData.nextPageToken ?? null,
//     });
//   } catch (error) {
//     console.error("YouTube API route error:", error);

//     return NextResponse.json(
//       {
//         error:
//           "YouTube検索中に予期しないエラーが発生しました。",
//       },
//       { status: 500 }
//     );
//   }
// }
//072111時54分に変更ここから新しいやつ、人気順とかの機能
import { NextResponse } from "next/server";

type YouTubeSearchResponse = {
  items?: unknown[];
  nextPageToken?: string;
  error?: {
    message?: string;
  };
};

type SortOrder =
  | "relevance"
  | "date"
  | "viewCount";

function getValidOrder(
  order: string | null
): SortOrder {
  if (order === "date") {
    return "date";
  }

  if (order === "viewCount") {
    return "viewCount";
  }

  return "relevance";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const keyword = searchParams.get("q")?.trim();

    const pageToken = searchParams
      .get("pageToken")
      ?.trim();

    const order = getValidOrder(
      searchParams.get("order")
    );

    if (!keyword) {
      return NextResponse.json({
        items: [],
        nextPageToken: null,
      });
    }

    const apiKey =
      process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "YouTube APIキーが設定されていません。",
        },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      part: "snippet",
      q: keyword,
      type: "video",
      maxResults: "12",
      order,
      key: apiKey,
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const youtubeResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
      {
        cache: "no-store",
      }
    );

    const youtubeData =
      (await youtubeResponse.json()) as YouTubeSearchResponse;

    if (!youtubeResponse.ok) {
      console.error(
        "YouTube APIエラー:",
        youtubeData
      );

      return NextResponse.json(
        {
          error:
            youtubeData.error?.message ??
            "YouTube検索に失敗しました。",
        },
        {
          status: youtubeResponse.status,
        }
      );
    }

    return NextResponse.json({
      items: youtubeData.items ?? [],
      nextPageToken:
        youtubeData.nextPageToken ?? null,
    });
  } catch (error) {
    console.error(
      "YouTube API route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "YouTube検索中に予期しないエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}