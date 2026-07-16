import { asRecord, asString, asNumber, asBoolean } from './parse';
import { decodeHtmlEntities } from './htmlEntities';
import type { Listing, RedditPost, MoreComments, RedditThing, RedditSubreddit } from './types';

const INLINE_IMAGE_PATTERN = /!\[[^\]]*\]\([a-zA-Z0-9_-]+\)/g;

export function mapPost(raw: unknown): RedditPost {
  const data = asRecord(asRecord(raw).data);
  return {
    id: asString(data.id),
    subreddit: asString(data.subreddit),
    title: decodeHtmlEntities(asString(data.title)),
    author: asString(data.author),
    score: asNumber(data.score),
    numComments: asNumber(data.num_comments),
    createdUtc: asNumber(data.created_utc),
    selftext: decodeHtmlEntities(asString(data.selftext)),
    url: asString(data.url),
    hasImage: postHasImage(data),
  };
}

function postHasImage(data: Record<string, unknown>): boolean {
  if (asString(data.post_hint) === 'image') return true;
  if (asBoolean(data.is_gallery)) return true;
  if (Array.isArray(asRecord(data.preview).images)) return true;
  return Object.keys(asRecord(data.media_metadata)).length > 0;
}

export function mapComment(raw: unknown): RedditThing {
  const record = asRecord(raw);
  if (asString(record.kind) === 'more') {
    return mapMoreComments(record);
  }
  const data = asRecord(record.data);
  return {
    kind: 'comment',
    id: asString(data.id),
    author: asString(data.author),
    body: redactInlineImages(decodeHtmlEntities(asString(data.body))),
    score: asNumber(data.score),
    createdUtc: asNumber(data.created_utc),
    replies: mapReplies(data.replies),
  };
}

function mapMoreComments(record: Record<string, unknown>): MoreComments {
  const data = asRecord(record.data);
  const children = data.children;
  return {
    kind: 'more',
    id: asString(data.id),
    childIds: Array.isArray(children) ? children.filter((child): child is string => typeof child === 'string') : [],
    count: asNumber(data.count),
  };
}

function mapReplies(replies: unknown): RedditThing[] {
  const children = asRecord(asRecord(replies).data).children;
  return Array.isArray(children) ? children.map(mapComment) : [];
}

function redactInlineImages(body: string): string {
  return body.replace(INLINE_IMAGE_PATTERN, '[has_image 🖼️]');
}

export function mapSubreddit(raw: unknown): RedditSubreddit {
  const data = asRecord(asRecord(raw).data);
  return {
    name: asString(data.display_name),
    title: decodeHtmlEntities(asString(data.title)),
    subscribers: asNumber(data.subscribers),
    publicDescription: decodeHtmlEntities(asString(data.public_description)),
  };
}

export function mapListing<T>(raw: unknown, mapItem: (item: unknown) => T): Listing<T> {
  const data = asRecord(asRecord(raw).data);
  const children = data.children;
  return {
    after: typeof data.after === 'string' ? data.after : null,
    children: Array.isArray(children) ? children.map(mapItem) : [],
  };
}
