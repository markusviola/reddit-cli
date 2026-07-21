import { loadToken } from '../token';
import { asRecord } from './parse';
import { mapListing, mapPost, mapComment, mapSubreddit } from './mappers';
import type { Listing, RedditPost, RedditThing, RedditSubreddit } from './types';

const BASE_URL = 'https://oauth.reddit.com';
const USER_AGENT = 'reddit-cli/0.1 (terminal Reddit browser)';

export type FeedSort = 'hot' | 'top' | 'new' | 'controversial';

export function sortParams(sort: FeedSort): Record<string, string> {
  return sort === 'top' || sort === 'controversial' ? { t: 'day' } : {};
}

export function buildUrl(path: string, params: Record<string, string>): string {
  const entries = Object.entries(params);
  if (entries.length === 0) return BASE_URL + path;
  const query = entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
  return `${BASE_URL}${path}?${query}`;
}

async function redditGet(path: string, params: Record<string, string>): Promise<unknown> {
  const token = loadToken(Date.now());
  const response = await fetch(buildUrl(path, params), {
    headers: {
      Authorization: `bearer ${token.accessToken}`,
      'User-Agent': USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function afterParam(after: string | null): Record<string, string> {
  return after === null ? {} : { after };
}

export async function getHomeFeed(sort: FeedSort, after: string | null): Promise<Listing<RedditPost>> {
  const raw = await redditGet(`/${sort}`, { ...sortParams(sort), ...afterParam(after) });
  return mapListing(raw, mapPost);
}

export async function getSubredditFeed(
  subreddit: string,
  sort: FeedSort,
  after: string | null
): Promise<Listing<RedditPost>> {
  const raw = await redditGet(`/r/${subreddit}/${sort}`, { ...sortParams(sort), ...afterParam(after) });
  return mapListing(raw, mapPost);
}

export async function searchSubreddits(query: string, after: string | null): Promise<Listing<RedditSubreddit>> {
  const raw = await redditGet('/subreddits/search', { q: query, ...afterParam(after) });
  return mapListing(raw, mapSubreddit);
}

export async function getJoinedSubreddits(after: string | null): Promise<Listing<RedditSubreddit>> {
  const raw = await redditGet('/subreddits/mine/subscriber', { ...afterParam(after) });
  return mapListing(raw, mapSubreddit);
}

export async function searchPosts(query: string, after: string | null): Promise<Listing<RedditPost>> {
  const raw = await redditGet('/search', { q: query, sort: 'relevance', ...afterParam(after) });
  return mapListing(raw, mapPost);
}

export async function getThread(subreddit: string, postId: string): Promise<{ post: RedditPost; comments: RedditThing[] }> {
  const raw = await redditGet(`/r/${subreddit}/comments/${postId}`, {});
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error('Unexpected thread response shape');
  }
  const postListing = mapListing(raw[0], mapPost);
  const commentListing = mapListing(raw[1], mapComment);
  const post = postListing.children[0];
  if (post === undefined) {
    throw new Error('Thread response contained no post');
  }
  return { post, comments: commentListing.children };
}

export async function loadMoreChildren(linkId: string, childIds: string[]): Promise<RedditThing[]> {
  const raw = await redditGet('/api/morechildren', {
    link_id: linkId,
    children: childIds.join(','),
    api_type: 'json',
  });
  const things = asRecord(asRecord(asRecord(raw).json).data).things;
  return Array.isArray(things) ? things.map(mapComment) : [];
}
