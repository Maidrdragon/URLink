// import { NextResponse } from "next/server";

// type TwitchTokenResponse = {
//   access_token?: string;
//   expires_in?: number;
//   token_type?: string;
//   message?: string;
// };

// type TwitchChannel = {
//   id: string;
//   broadcaster_login: string;
//   display_name: string;
//   game_name: string;
//   title: string;
//   thumbnail_url: string;
//   is_live: boolean;
//   started_at: string;
// };

// type TwitchSearchResponse = {
//   data?: TwitchChannel[];
//   message?: string;
// };

// export async function GET(request: Request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const keyword = searchParams.get("q")?.trim();

//     if (!keyword) {
//       return NextResponse.json([]);
//     }

//     const clientId = process.env.TWITCH_CLIENT_ID;
//     const clientSecret = process.env.TWITCH_CLIENT_SECRET;

//     if (!clientId || !clientSecret) {
//       return NextResponse.json(
//         {
//           error:
//             "TWITCH_CLIENT_ID または TWITCH_CLIENT_SECRET が設定されていません。",
//         },
//         { status: 500 }
//       );
//     }

//     // Twitchのアクセストークンを取得
//     const tokenResponse = await fetch(
//       "https://id.twitch.tv/oauth2/token",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//         body: new URLSearchParams({
//           client_id: clientId,
//           client_secret: clientSecret,
//           grant_type: "client_credentials",
//         }),
//         cache: "no-store",
//       }
//     );

//     const tokenData =
//       (await tokenResponse.json()) as TwitchTokenResponse;

//     if (!tokenResponse.ok || !tokenData.access_token) {
//       console.error("Twitch token error:", tokenData);

//       return NextResponse.json(
//         {
//           error: "Twitchのアクセストークンを取得できませんでした。",
//           details: tokenData.message ?? "不明なエラー",
//         },
//         { status: tokenResponse.status || 500 }
//       );
//     }

//     // Twitchのチャンネルを検索
//     const twitchResponse = await fetch(
//       `https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(
//         keyword
//       )}&first=12`,
//       {
//         headers: {
//           "Client-Id": clientId,
//           Authorization: `Bearer ${tokenData.access_token}`,
//         },
//         cache: "no-store",
//       }
//     );

//     const twitchData =
//       (await twitchResponse.json()) as TwitchSearchResponse;

//     if (!twitchResponse.ok) {
//       console.error("Twitch search error:", twitchData);

//       return NextResponse.json(
//         {
//           error: "Twitch検索に失敗しました。",
//           details: twitchData.message ?? "不明なエラー",
//         },
//         { status: twitchResponse.status }
//       );
//     }

//     const channels = (twitchData.data ?? []).map((channel) => ({
//       id: channel.id,
//       login: channel.broadcaster_login,
//       name: channel.display_name,
//       title: channel.title,
//       gameName: channel.game_name,
//       thumbnail: channel.thumbnail_url,
//       isLive: channel.is_live,
//       startedAt: channel.started_at,
//       url: `https://www.twitch.tv/${channel.broadcaster_login}`,
//     }));

//     return NextResponse.json(channels);
//   } catch (error) {
//     console.error("Twitch API route error:", error);

//     return NextResponse.json(
//       {
//         error: "Twitch APIで予期しないエラーが発生しました。",あ
//       },
//       { status: 500 }
//     );
//   }
// }
//ここまで昔できてた機能のコードのやつ
import { NextResponse } from "next/server";

type TwitchTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  message?: string;
};

type TwitchChannel = {
  id: string;
  broadcaster_login: string;
  display_name: string;
  game_name: string;
  title: string;
  thumbnail_url: string;
  is_live: boolean;
  started_at: string;
};

type TwitchSearchResponse = {
  data?: TwitchChannel[];
  pagination?: {
    cursor?: string;
  };
  message?: string;
};

let savedAccessToken = "";
let accessTokenExpiresAt = 0;

async function getTwitchAccessToken(
  clientId: string,
  clientSecret: string
) {
  const now = Date.now();

  // 保存したトークンが有効なら再利用
  if (
    savedAccessToken &&
    now < accessTokenExpiresAt
  ) {
    return savedAccessToken;
  }

  const tokenResponse = await fetch(
    "https://id.twitch.tv/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    }
  );

  const tokenData =
    (await tokenResponse.json()) as TwitchTokenResponse;

  if (
    !tokenResponse.ok ||
    !tokenData.access_token
  ) {
    throw new Error(
      tokenData.message ??
        "Twitchアクセストークンを取得できませんでした。"
    );
  }

  savedAccessToken = tokenData.access_token;

  const expiresInSeconds =
    tokenData.expires_in ?? 3600;

  // 有効期限より1分早く再取得
  accessTokenExpiresAt =
    now + Math.max(expiresInSeconds - 60, 60) * 1000;

  return savedAccessToken;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const keyword =
      searchParams.get("q")?.trim() ?? "";

    const cursor =
      searchParams.get("cursor")?.trim() ?? "";

    if (!keyword) {
      return NextResponse.json({
        items: [],
        nextCursor: null,
      });
    }

    const clientId =
      process.env.TWITCH_CLIENT_ID;

    const clientSecret =
      process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            "TWITCH_CLIENT_IDまたはTWITCH_CLIENT_SECRETが設定されていません。",
        },
        { status: 500 }
      );
    }

    const accessToken =
      await getTwitchAccessToken(
        clientId,
        clientSecret
      );

    const params = new URLSearchParams({
      query: keyword,
      first: "12",
    });

    // 2ページ目以降
    if (cursor) {
      params.set("after", cursor);
    }

    const twitchResponse = await fetch(
      `https://api.twitch.tv/helix/search/channels?${params.toString()}`,
      {
        headers: {
          "Client-Id": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const twitchData =
      (await twitchResponse.json()) as TwitchSearchResponse;

    if (!twitchResponse.ok) {
      console.error(
        "Twitch検索APIエラー:",
        twitchData
      );

      return NextResponse.json(
        {
          error:
            twitchData.message ??
            "Twitch検索に失敗しました。",
        },
        {
          status: twitchResponse.status,
        }
      );
    }

    const items = (twitchData.data ?? []).map(
      (channel) => ({
        id: channel.id,
        login: channel.broadcaster_login,
        name: channel.display_name,
        title: channel.title,
        gameName: channel.game_name,
        thumbnail: channel.thumbnail_url,
        isLive: channel.is_live,
        startedAt: channel.started_at,
        url: `https://www.twitch.tv/${channel.broadcaster_login}`,
      })
    );

    return NextResponse.json({
      items,
      nextCursor:
        twitchData.pagination?.cursor ?? null,
    });
  } catch (error) {
    console.error(
      "Twitch API route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Twitch検索中にエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}