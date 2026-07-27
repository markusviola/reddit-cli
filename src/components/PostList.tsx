import React, { useState } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { useListNav } from '../hooks/useListNav';
import { ImageTag } from './ImageTag';
import { RowText } from './RowText';
import { useImageViewer } from '../hooks/useImageViewer';
import { useVisibleWindow } from '../hooks/useVisibleWindow';
import { estimateWrappedLines } from '../rendering/textMetrics';
import { formatRelativeTime } from '../rendering/relativeTime';
import type { RedditPost, ImageAttachment } from '../reddit/types';

export type PostListProps = {
  posts: RedditPost[];
  onSelect: (post: RedditPost) => void;
  onReachEnd: () => void;
  emptyMessage: string;
  availableHeight: number;
};

type PostRow =
  | { kind: 'post'; id: string; post: RedditPost }
  | { kind: 'image'; id: string; attachment: ImageAttachment };

function metaText(post: RedditPost, nowSeconds: number): string {
  const age = formatRelativeTime(post.createdUtc, nowSeconds);
  return `r/${post.subreddit} · u/${post.author} · ${post.score} pts · ${post.numComments} comments · ${age}`;
}

// The single image a list row can open: the post's primary attachment,
// else its first inline image, else none.
function listAttachment(post: RedditPost): ImageAttachment | null {
  if (post.primaryAttachment !== null) return post.primaryAttachment;
  const inline = post.bodySegments.find((segment) => segment.kind === 'image');
  return inline?.kind === 'image' ? inline.attachment : null;
}

function buildPostRows(posts: RedditPost[]): PostRow[] {
  const rows: PostRow[] = [];
  for (const post of posts) {
    rows.push({ kind: 'post', id: `post:${post.id}`, post });
    const attachment = listAttachment(post);
    if (attachment !== null) rows.push({ kind: 'image', id: `img:${post.id}`, attachment });
  }
  return rows;
}

function estimateRowHeight(row: PostRow, columns: number, nowSeconds: number): number {
  if (row.kind === 'post') {
    const hasImageRow = listAttachment(row.post) !== null;
    return (
      estimateWrappedLines(row.post.title, columns) +
      estimateWrappedLines(metaText(row.post, nowSeconds), columns) +
      (hasImageRow ? 0 : 1)
    );
  }
  return 2;
}

export function PostList({ posts, onSelect, onReachEnd, emptyMessage, availableHeight }: PostListProps): React.ReactElement {
  const { columns } = useWindowSize();
  const rows = buildPostRows(posts);
  const viewer = useImageViewer();
  const [nowSeconds] = useState(() => Date.now() / 1000);

  const { selectedIndex } = useListNav<PostRow>({
    items: rows,
    onActivate: (row) => {
      if (row.kind === 'post') onSelect(row.post);
      else viewer.openImage(row.attachment);
    },
    onReachEnd,
  });

  const itemHeights = rows.map((row) => estimateRowHeight(row, columns, nowSeconds));
  const { start, end, hasAbove, hasBelow } = useVisibleWindow(rows.length, selectedIndex, itemHeights, availableHeight);

  if (posts.length === 0) {
    return <Text>{emptyMessage}</Text>;
  }

  return (
    <Box flexDirection="column">
      {hasAbove ? <Text dimColor>{`↑ ${start} more above`}</Text> : null}
      {rows.slice(start, end).map((row, offset) => {
        const index = start + offset;
        const selected = index === selectedIndex;
        if (row.kind === 'post') {
          const hasImageRow = listAttachment(row.post) !== null;
          return (
            <Box key={row.id} flexDirection="column" marginBottom={hasImageRow ? 0 : 1}>
              <Text color={selected ? 'green' : 'blue'} bold={selected}>
                {row.post.title}
              </Text>
              <RowText selected={selected} dim>
                {metaText(row.post, nowSeconds)}
              </RowText>
            </Box>
          );
        }
        return (
          <Box key={row.id} marginBottom={1}>
            <ImageTag attachment={row.attachment} selected={selected} available={viewer.available} />
          </Box>
        );
      })}
      {hasBelow ? <Text dimColor>{`↓ ${posts.length - end} more below`}</Text> : null}
    </Box>
  );
}
