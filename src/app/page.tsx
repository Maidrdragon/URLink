
//072021時15分お気に入りボタンを導入したコード0721人気順二書き換えたところ
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Header, { type SortOrder } from "../../components/Header";
import FavoriteButton from "../../components/FavoriteButton";

type YouTubeVideo = {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
};

type TwitchChannel = {
  id: string;
  login: string;
  name: string;
  title: string;
  gameName: string;
  thumbnail: string;
  isLive: boolean;
  startedAt: string;
  url: string;
};

type YouTubeApiResponse = {
  items?: YouTubeVideo[];
  nextPageToken?: string | null;
  error?: string;
};

type TwitchApiResponse = {
  items?: TwitchChannel[];
  nextCursor?: string | null;
  error?: string;
};

type FeedItem =
  | {
      feedId: string;
      service: "youtube";
      searchKeyword: string;
      video: YouTubeVideo;
    }
  | {
      feedId: string;
      service: "twitch";
      searchKeyword: string;
      channel: TwitchChannel;
    };

type KeywordPageState = {
  keyword: string;
  youtubeNextPageToken: string | null;
  twitchNextCursor: string | null;
};

type SearchResult =
  | {
      service: "youtube";
      keyword: string;
      data: YouTubeApiResponse;
    }
  | {
      service: "twitch";
      keyword: string;
      data: TwitchApiResponse;
    };

const MAX_SEARCH_KEYWORDS = 5;

function parseSearchKeywords(input: string): string[] {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return [];
  }

  // 「#ホロライブ #にじさんじ」の形式
  const hashtagMatches = Array.from(
    trimmedInput.matchAll(/#([^\s#、,，]+)/g)
  );

  if (hashtagMatches.length > 0) {
    const hashtags = hashtagMatches
      .map((match) => match[1]?.trim())
      .filter(
        (keyword): keyword is string =>
          Boolean(keyword)
      );

    return Array.from(new Set(hashtags)).slice(
      0,
      MAX_SEARCH_KEYWORDS
    );
  }

  // 「ホロライブ、にじさんじ」
  // 「ホロライブ, にじさんじ」
  // 「ホロライブ，にじさんじ」の形式
  const separatedKeywords = trimmedInput
    .split(/[、,，]+/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  if (separatedKeywords.length > 1) {
    return Array.from(
      new Set(separatedKeywords)
    ).slice(0, MAX_SEARCH_KEYWORDS);
  }

  // 区切りがない場合は、今までどおり通常検索
  return [trimmedInput];
}

function mixFeedItems(
  youtubeVideos: YouTubeVideo[],
  twitchChannels: TwitchChannel[],
  keyword: string
): FeedItem[] {
  const mixedItems: FeedItem[] = [];

  const maximumLength = Math.max(
    youtubeVideos.length,
    twitchChannels.length
  );

  for (let index = 0; index < maximumLength; index++) {
    const youtubeVideo = youtubeVideos[index];
    const twitchChannel = twitchChannels[index];

    if (youtubeVideo?.id?.videoId) {
      mixedItems.push({
        feedId: `youtube-${youtubeVideo.id.videoId}`,
        service: "youtube",
        searchKeyword: keyword,
        video: youtubeVideo,
      });
    }

    if (twitchChannel?.id) {
      mixedItems.push({
        feedId: `twitch-${twitchChannel.id}`,
        service: "twitch",
        searchKeyword: keyword,
        channel: twitchChannel,
      });
    }
  }

  return mixedItems;
}

function interleaveKeywordGroups(
  groups: FeedItem[][]
): FeedItem[] {
  const mixedItems: FeedItem[] = [];
  const maximumLength = Math.max(
    0,
    ...groups.map((group) => group.length)
  );

  for (let index = 0; index < maximumLength; index++) {
    for (const group of groups) {
      const item = group[index];

      if (item) {
        mixedItems.push(item);
      }
    }
  }

  return mixedItems;
}

function removeDuplicateItems(items: FeedItem[]) {
  const seenIds = new Set<string>();

  return items.filter((item) => {
    if (seenIds.has(item.feedId)) {
      return false;
    }

    seenIds.add(item.feedId);
    return true;
  });
}

async function fetchYouTube(
  keyword: string,
  order: SortOrder,
  pageToken?: string | null
): Promise<YouTubeApiResponse> {
  const searchParameters = new URLSearchParams({
    q: keyword,
    order,
  });

  if (pageToken) {
    searchParameters.set("pageToken", pageToken);
  }

  const response = await fetch(
    `/api/youtube?${searchParameters.toString()}`
  );

  const data =
    (await response.json()) as YouTubeApiResponse;

  if (!response.ok) {
    throw new Error(
      data.error ?? "YouTube検索に失敗しました。"
    );
  }

  return data;
}

async function fetchTwitch(
  keyword: string,
  cursor?: string | null
): Promise<TwitchApiResponse> {
  const searchParameters = new URLSearchParams({
    q: keyword,
  });

  if (cursor) {
    searchParameters.set("cursor", cursor);
  }

  const response = await fetch(
    `/api/twitch?${searchParameters.toString()}`
  );

  const data =
    (await response.json()) as TwitchApiResponse;

  if (!response.ok) {
    throw new Error(
      data.error ?? "Twitch検索に失敗しました。"
    );
  }

  return data;
}

export default function Home() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>(
    []
  );

  const [keywordPageStates, setKeywordPageStates] =
    useState<KeywordPageState[]>([]);

  const [searchWord, setSearchWord] = useState("");
  const [searchKeywords, setSearchKeywords] = useState<
    string[]
  >([]);

  const [selectedOrder, setSelectedOrder] =
    useState<SortOrder>("relevance");

  const [searched, setSearched] = useState(false);

  const [initialLoading, setInitialLoading] =
    useState(false);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const searchRequestIdRef = useRef(0);

  const hasMoreResults = keywordPageStates.some(
    (state) =>
      Boolean(state.youtubeNextPageToken) ||
      Boolean(state.twitchNextCursor)
  );

  async function searchAll(input: string, order: SortOrder) {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
      return;
    }

    const parsedKeywords =
      parseSearchKeywords(trimmedInput);

    if (parsedKeywords.length === 0) {
      return;
    }

    const requestId =
      searchRequestIdRef.current + 1;

    searchRequestIdRef.current = requestId;

    setSearchWord(trimmedInput);
    setSearchKeywords(parsedKeywords);
    setSelectedOrder(order);
    setSearched(true);
    setInitialLoading(true);
    setLoadingMore(false);
    setError("");
    setNotice("");

    setFeedItems([]);
    setKeywordPageStates([]);

    const hashtagCount = Array.from(
      trimmedInput.matchAll(/#([^\s#、,，]+)/g)
    ).length;

    const separatedKeywordCount = trimmedInput
      .split(/[、,，]+/)
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0)
      .length;

    const inputKeywordCount =
      hashtagCount > 0
        ? hashtagCount
        : separatedKeywordCount;

    if (inputKeywordCount > MAX_SEARCH_KEYWORDS) {
      setNotice(
        `検索負荷を抑えるため、先頭の${MAX_SEARCH_KEYWORDS}個のワードを検索しています。`
      );
    }

    try {
      const requests: Promise<SearchResult>[] = [];

      for (const keyword of parsedKeywords) {
        requests.push(
          fetchYouTube(keyword, order).then((data) => ({
            service: "youtube" as const,
            keyword,
            data,
          }))
        );

        requests.push(
          fetchTwitch(keyword).then((data) => ({
            service: "twitch" as const,
            keyword,
            data,
          }))
        );
      }

      const results =
        await Promise.allSettled(requests);

      if (
        requestId !== searchRequestIdRef.current
      ) {
        return;
      }

      const youtubeItemsByKeyword = new Map<
        string,
        YouTubeVideo[]
      >();

      const twitchItemsByKeyword = new Map<
        string,
        TwitchChannel[]
      >();

      const nextStates = parsedKeywords.map(
        (keyword): KeywordPageState => ({
          keyword,
          youtubeNextPageToken: null,
          twitchNextCursor: null,
        })
      );

      let successfulRequestCount = 0;
      let failedRequestCount = 0;

      for (const result of results) {
        if (result.status === "rejected") {
          failedRequestCount += 1;
          console.error(
            "検索エラー:",
            result.reason
          );
          continue;
        }

        successfulRequestCount += 1;

        const { keyword, service, data } =
          result.value;

        const state = nextStates.find(
          (item) => item.keyword === keyword
        );

        if (!state) {
          continue;
        }

        if (service === "youtube") {
          const youtubeData =
            data as YouTubeApiResponse;

          youtubeItemsByKeyword.set(
            keyword,
            youtubeData.items ?? []
          );

          state.youtubeNextPageToken =
            youtubeData.nextPageToken ?? null;
        } else {
          const twitchData =
            data as TwitchApiResponse;

          twitchItemsByKeyword.set(
            keyword,
            twitchData.items ?? []
          );

          state.twitchNextCursor =
            twitchData.nextCursor ?? null;
        }
      }

      const keywordGroups = parsedKeywords.map(
        (keyword) =>
          mixFeedItems(
            youtubeItemsByKeyword.get(keyword) ?? [],
            twitchItemsByKeyword.get(keyword) ?? [],
            keyword
          )
      );

      setFeedItems(
        removeDuplicateItems(
          interleaveKeywordGroups(keywordGroups)
        )
      );

      setKeywordPageStates(nextStates);

      if (successfulRequestCount === 0) {
        setError(
          "すべての検索に失敗しました。YouTubeとTwitchのAPI設定を確認してください。"
        );
      } else if (failedRequestCount > 0) {
        setError(
          "一部の検索結果を取得できませんでした。取得できた結果のみ表示しています。"
        );
      }
    } catch (searchError) {
      console.error(
        "検索中のエラー:",
        searchError
      );

      if (
        requestId === searchRequestIdRef.current
      ) {
        setError(
          "検索中にエラーが発生しました。もう一度試してください。"
        );
      }
    } finally {
      if (
        requestId === searchRequestIdRef.current
      ) {
        setInitialLoading(false);
      }
    }
  }

  const loadMore = useCallback(async () => {
    if (
      initialLoading ||
      loadingMore ||
      !hasMoreResults
    ) {
      return;
    }

    setLoadingMore(true);

    try {
      const requests: Promise<SearchResult>[] = [];

      for (const state of keywordPageStates) {
        if (state.youtubeNextPageToken) {
          requests.push(
            fetchYouTube(
              state.keyword,
              selectedOrder,
              state.youtubeNextPageToken
            ).then((data) => ({
              service: "youtube" as const,
              keyword: state.keyword,
              data,
            }))
          );
        }

        if (state.twitchNextCursor) {
          requests.push(
            fetchTwitch(
              state.keyword,
              state.twitchNextCursor
            ).then((data) => ({
              service: "twitch" as const,
              keyword: state.keyword,
              data,
            }))
          );
        }
      }

      if (requests.length === 0) {
        return;
      }

      const results =
        await Promise.allSettled(requests);

      const nextStates = keywordPageStates.map(
        (state) => ({ ...state })
      );

      const youtubeItemsByKeyword = new Map<
        string,
        YouTubeVideo[]
      >();

      const twitchItemsByKeyword = new Map<
        string,
        TwitchChannel[]
      >();

      let failedRequestCount = 0;

      for (const result of results) {
        if (result.status === "rejected") {
          failedRequestCount += 1;
          console.error(
            "追加読み込みエラー:",
            result.reason
          );
          continue;
        }

        const { keyword, service, data } =
          result.value;

        const state = nextStates.find(
          (item) => item.keyword === keyword
        );

        if (!state) {
          continue;
        }

        if (service === "youtube") {
          const youtubeData =
            data as YouTubeApiResponse;

          youtubeItemsByKeyword.set(
            keyword,
            youtubeData.items ?? []
          );

          state.youtubeNextPageToken =
            youtubeData.nextPageToken ?? null;
        } else {
          const twitchData =
            data as TwitchApiResponse;

          twitchItemsByKeyword.set(
            keyword,
            twitchData.items ?? []
          );

          state.twitchNextCursor =
            twitchData.nextCursor ?? null;
        }
      }

      const newKeywordGroups = nextStates.map(
        (state) =>
          mixFeedItems(
            youtubeItemsByKeyword.get(state.keyword) ??
              [],
            twitchItemsByKeyword.get(state.keyword) ??
              [],
            state.keyword
          )
      );

      const newItems = interleaveKeywordGroups(
        newKeywordGroups
      );

      setKeywordPageStates(nextStates);

      setFeedItems((currentItems) =>
        removeDuplicateItems([
          ...currentItems,
          ...newItems,
        ])
      );

      if (failedRequestCount > 0) {
        setError(
          "一部の続きを読み込めませんでした。取得できた結果のみ追加しています。"
        );
      }
    } catch (loadError) {
      console.error(
        "追加読み込みエラー:",
        loadError
      );

      setError(
        "続きの検索結果を読み込めませんでした。"
      );
    } finally {
      setLoadingMore(false);
    }
  }, [
    initialLoading,
    loadingMore,
    hasMoreResults,
    keywordPageStates,
    selectedOrder,
  ]);

  useEffect(() => {
    const target = bottomRef.current;

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (firstEntry?.isIntersecting) {
          void loadMore();
        }
      },
      {
        rootMargin: "500px 0px",
        threshold: 0,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [loadMore]);

  return (
    <div className="min-h-screen bg-slate-100">
      <Header onSearch={searchAll} />

      <main className="mx-auto max-w-[1500px] px-6 py-8">
        {!searched && !initialLoading && (
          <section className="py-24 text-center">
            <h2 className="text-4xl font-extrabold text-slate-950">
              YouTubeとTwitchをまとめて検索
            </h2>

            <p className="mt-4 text-lg font-semibold text-slate-700">
              気になる動画や配信者をお気に入りに保存できます
            </p>

            <div className="mx-auto mt-7 max-w-2xl rounded-2xl border border-slate-300 bg-white p-5 text-left shadow-sm">
              <p className="font-extrabold text-slate-950">
                複数ワードのOR検索
              </p>

              <p className="mt-2 font-semibold text-slate-700">
                例：日本、食べ物、夏
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-600">
                「、」または「,」で分けたワードをOR条件で検索、結果を1つの画面にまとめ表示
              </p>
            </div>
          </section>
        )}

        {initialLoading && (
          <section className="py-24 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />

            <p className="mt-5 text-xl font-extrabold text-slate-950">
              「{searchWord}」を検索中...
            </p>
          </section>
        )}

        {!initialLoading && notice && (
          <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-bold text-amber-900">
              {notice}
            </p>
          </div>
        )}

        {!initialLoading && error && (
          <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4">
            <p className="font-bold text-red-800">
              {error}
            </p>
          </div>
        )}

        {!initialLoading && searched && (
          <section>
            <div className="mb-7">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-extrabold text-slate-950">
                  「{searchWord}」の検索結果
                </h2>

                <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-bold text-slate-800">
                  {feedItems.length}件表示
                </span>
              </div>

              {searchKeywords.length > 1 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {searchKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-blue-100 px-3 py-1 text-sm font-extrabold text-blue-800"
                    >
                      #{keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {feedItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {feedItems.map((item) => {
                  if (
                    item.service === "youtube"
                  ) {
                    const video = item.video;

                    const videoUrl =
                      `https://www.youtube.com/watch?v=${video.id.videoId}`;

                    return (
                      <article
                        key={item.feedId}
                        className="overflow-hidden rounded-2xl bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                      >
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block"
                        >
                          <div className="relative aspect-video overflow-hidden bg-slate-300">
                            <img
                              src={
                                video.snippet
                                  .thumbnails.medium.url
                              }
                              alt={
                                video.snippet.title
                              }
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />

                            <span className="absolute left-3 top-3 rounded bg-red-600 px-2 py-1 text-xs font-extrabold text-white">
                              YouTube
                            </span>

                            {searchKeywords.length > 1 && (
                              <span className="absolute bottom-3 left-3 max-w-[85%] truncate rounded-full bg-black/75 px-2 py-1 text-xs font-bold text-white">
                                #{item.searchKeyword}
                              </span>
                            )}
                          </div>

                          <div className="px-4 pt-4">
                            <h3 className="line-clamp-3 text-base font-extrabold leading-6 text-slate-950">
                              {video.snippet.title}
                            </h3>

                            <p className="mt-3 text-sm font-bold text-slate-700">
                              {
                                video.snippet
                                  .channelTitle
                              }
                            </p>

                            <p className="mt-2 text-xs font-bold text-red-600">
                              YouTubeで見る
                            </p>
                          </div>
                        </a>

                        <div className="p-4 pt-3">
                          <FavoriteButton
                            item={{
                              id: item.feedId,
                              service: "youtube",
                              title:
                                video.snippet.title,
                              creator:
                                video.snippet
                                  .channelTitle,
                              thumbnail:
                                video.snippet
                                  .thumbnails.medium
                                  .url,
                              url: videoUrl,
                            }}
                          />
                        </div>
                      </article>
                    );
                  }

                  const channel = item.channel;

                  return (
                    <article
                      key={item.feedId}
                      className="overflow-hidden rounded-2xl bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >
                      <a
                        href={channel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block"
                      >
                        <div className="relative aspect-video overflow-hidden bg-slate-800">
                          {channel.thumbnail ? (
                            <img
                              src={channel.thumbnail}
                              alt={channel.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-5xl font-extrabold text-white">
                              T
                            </div>
                          )}

                          <span className="absolute left-3 top-3 rounded bg-purple-700 px-2 py-1 text-xs font-extrabold text-white">
                            Twitch
                          </span>

                          {channel.isLive && (
                            <span className="absolute right-3 top-3 rounded bg-red-600 px-2 py-1 text-xs font-extrabold text-white">
                              LIVE
                            </span>
                          )}

                          {searchKeywords.length > 1 && (
                            <span className="absolute bottom-3 left-3 max-w-[85%] truncate rounded-full bg-black/75 px-2 py-1 text-xs font-bold text-white">
                              #{item.searchKeyword}
                            </span>
                          )}
                        </div>

                        <div className="px-4 pt-4">
                          <h3 className="line-clamp-2 text-base font-extrabold leading-6 text-slate-950">
                            {channel.title ||
                              channel.name}
                          </h3>

                          <p className="mt-3 text-sm font-extrabold text-slate-800">
                            {channel.name}
                          </p>

                          {channel.gameName && (
                            <p className="mt-1 text-sm font-semibold text-slate-600">
                              {channel.gameName}
                            </p>
                          )}

                          <p className="mt-2 text-xs font-bold text-purple-700">
                            Twitchで見る
                          </p>
                        </div>
                      </a>

                      <div className="p-4 pt-3">
                        <FavoriteButton
                          item={{
                            id: item.feedId,
                            service: "twitch",
                            title:
                              channel.title ||
                              channel.name,
                            creator: channel.name,
                            thumbnail:
                              channel.thumbnail,
                            url: channel.url,
                            gameName:
                              channel.gameName,
                            isLive:
                              channel.isLive,
                          }}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-white p-8 shadow-sm">
                <p className="font-bold text-slate-700">
                  検索結果が見つかりませんでした。
                </p>
              </div>
            )}

            <div
              ref={bottomRef}
              className="flex min-h-32 items-center justify-center"
            >
              {loadingMore && (
                <div className="py-10 text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />

                  <p className="mt-4 font-bold text-slate-700">
                    続きを読み込んでいます...
                  </p>
                </div>
              )}

              {!loadingMore &&
                feedItems.length > 0 &&
                !hasMoreResults && (
                  <p className="py-10 font-bold text-slate-600">
                    すべての検索結果を表示しました
                  </p>
                )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}