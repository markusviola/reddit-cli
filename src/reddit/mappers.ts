import { asRecord, asString, asNumber, asBoolean } from './parse';
import { decodeHtmlEntities } from './htmlEntities';
import type {
  Listing,
  RedditPost,
  MoreComments,
  RedditThing,
  RedditSubreddit,
  ImageRef,
  ImageAttachment,
  BodySegment,
} from './types';

const INLINE_IMAGE_PATTERN = /!\[[^\]]*\]\(([a-zA-Z0-9_-]+)\)/g;

export function mapPost(raw: unknown): RedditPost {
  const data = asRecord(asRecord(raw).data);
  const media = asRecord(data.media_metadata);
  const primaryAttachment = extractPrimaryAttachment(data, media);
  const selftext = decodeHtmlEntities(asString(data.selftext));
  const bodySegments = buildPostSegments(selftext, media, primaryAttachment);
  return {
    id: asString(data.id),
    subreddit: asString(data.subreddit),
    title: decodeHtmlEntities(asString(data.title)),
    author: asString(data.author),
    score: asNumber(data.score),
    numComments: asNumber(data.num_comments),
    createdUtc: asNumber(data.created_utc),
    selftext,
    url: asString(data.url),
    hasImage: primaryAttachment !== null || bodySegments.some((segment) => segment.kind === 'image'),
    primaryAttachment,
    bodySegments,
  };
}

// Gallery images first (ordered), else a single preview/hint image.
function extractPrimaryAttachment(
  data: Record<string, unknown>,
  media: Record<string, unknown>
): ImageAttachment | null {
  if (asBoolean(data.is_gallery)) {
    const gallery = extractGallery(data, media);
    if (gallery !== null) return gallery;
  }
  return extractSingleImage(data);
}

function extractGallery(data: Record<string, unknown>, media: Record<string, unknown>): ImageAttachment | null {
  const items = asRecord(data.gallery_data).items;
  if (!Array.isArray(items)) return null;
  const images: ImageRef[] = [];
  for (const item of items) {
    const mediaId = asString(asRecord(item).media_id);
    const image = imageFromMediaMeta(mediaId, asRecord(media[mediaId]));
    if (image !== null) images.push(image);
  }
  if (images.length === 0) return null;
  const id = asString(data.id) || (images[0]?.id ?? '');
  return { id, images };
}

function extractSingleImage(data: Record<string, unknown>): ImageAttachment | null {
  const previewImages = asRecord(data.preview).images;
  if (Array.isArray(previewImages) && previewImages.length > 0) {
    const first = asRecord(previewImages[0]);
    const source = asRecord(first.source);
    const url = asString(source.url);
    if (url.length > 0) {
      const id = asString(first.id) || asString(data.id);
      return {
        id,
        images: [{ id, url: decodeHtmlEntities(url), width: asNumber(source.width), height: asNumber(source.height) }],
      };
    }
  }
  if (asString(data.post_hint) === 'image') {
    const url = asString(data.url);
    if (url.length > 0) {
      const id = asString(data.id);
      return { id, images: [{ id, url, width: 0, height: 0 }] };
    }
  }
  return null;
}

function imageFromMediaMeta(mediaId: string, meta: Record<string, unknown>): ImageRef | null {
  const source = asRecord(meta.s);
  const url = asString(source.u) || asString(source.gif);
  if (url.length === 0) return null;
  return { id: mediaId, url: decodeHtmlEntities(url), width: asNumber(source.x), height: asNumber(source.y) };
}

// Post body: the primary attachment (if any) then the self-text with
// its inline images resolved in place.
function buildPostSegments(
  selftext: string,
  media: Record<string, unknown>,
  primaryAttachment: ImageAttachment | null
): BodySegment[] {
  const inlineSegments = parseBodySegments(selftext, media);
  if (primaryAttachment === null) return inlineSegments;
  return [{ kind: 'image', attachment: primaryAttachment }, ...inlineSegments];
}

// Splits a body into text and inline-image segments, resolving each
// ![alt](mediaId) reference against the thing's media_metadata.
export function parseBodySegments(body: string, media: Record<string, unknown>): BodySegment[] {
  const segments: BodySegment[] = [];
  let lastIndex = 0;
  for (const match of body.matchAll(INLINE_IMAGE_PATTERN)) {
    const start = match.index ?? 0;
    pushText(segments, body.slice(lastIndex, start));
    const image = imageFromMediaMeta(match[1] ?? '', asRecord(media[match[1] ?? '']));
    if (image !== null) {
      segments.push({ kind: 'image', attachment: { id: image.id, images: [image] } });
    }
    lastIndex = start + match[0].length;
  }
  pushText(segments, body.slice(lastIndex));
  return segments;
}

function pushText(segments: BodySegment[], text: string): void {
  if (text.trim().length > 0) segments.push({ kind: 'text', text: text.trim() });
}

function segmentsToText(segments: BodySegment[]): string {
  return segments
    .filter((segment): segment is Extract<BodySegment, { kind: 'text' }> => segment.kind === 'text')
    .map((segment) => segment.text)
    .join('\n\n');
}

export function mapComment(raw: unknown): RedditThing {
  const record = asRecord(raw);
  if (asString(record.kind) === 'more') {
    return mapMoreComments(record);
  }
  const data = asRecord(record.data);
  const bodySegments = parseBodySegments(decodeHtmlEntities(asString(data.body)), asRecord(data.media_metadata));
  return {
    kind: 'comment',
    id: asString(data.id),
    author: asString(data.author),
    body: segmentsToText(bodySegments),
    bodySegments,
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
