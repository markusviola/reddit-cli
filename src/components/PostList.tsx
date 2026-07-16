import React from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { useListNav } from '../hooks/useListNav';
import { ImageTag } from './ImageTag';
import { RowText } from './RowText';
import { useVisibleWindow } from '../hooks/useVisibleWindow';
import { estimateWrappedLines, truncateToLines } from '../rendering/textMetrics';
import type { RedditPost } from '../reddit/types';

export type PostListProps = {
  posts: RedditPost[];
  onSelect: (post: RedditPost) => void;
  onReachEnd: () => void;
  emptyMessage: string;
  availableHeight: number;
};

function metaText(post: RedditPost): string {
  return `r/${post.subreddit} · u/${post.author} · ${post.score} pts · ${post.numComments} comments`;
}

function estimatePostHeight(post: RedditPost, columns: number): number {
  const titleLines = estimateWrappedLines(post.title, columns);
  const imageLines = post.hasImage ? 1 : 0;
  const metaLines = estimateWrappedLines(metaText(post), columns);
  return titleLines + imageLines + metaLines + 1;
}

export function PostList({
  posts,
  onSelect,
  onReachEnd,
  emptyMessage,
  availableHeight,
}: PostListProps): React.ReactElement {
  const { selectedIndex } = useListNav({ items: posts, onActivate: onSelect, onReachEnd });
  const { columns } = useWindowSize();
  const itemHeights = posts.map((post) => estimatePostHeight(post, columns));
  const { start, end, hasAbove, hasBelow } = useVisibleWindow(posts.length, selectedIndex, itemHeights, availableHeight);

  if (posts.length === 0) {
    return <Text>{emptyMessage}</Text>;
  }

  const usedHeight = itemHeights.slice(start, end).reduce((sum, height) => sum + height, 0);
  const indicatorLines = (hasAbove ? 1 : 0) + (hasBelow ? 1 : 0);
  const remainingSlack = availableHeight - usedHeight - indicatorLines;
  const nextPost = hasBelow ? posts[end] : undefined;
  const truncatedPreview =
    nextPost !== undefined && remainingSlack > 0 ? truncateToLines(nextPost.title, columns, remainingSlack) : undefined;

  return (
    <Box flexDirection="column">
      {hasAbove ? <Text dimColor>{`↑ ${start} more above`}</Text> : null}
      {posts.slice(start, end).map((post, offset) => {
        const index = start + offset;
        const selected = index === selectedIndex;
        return (
          <Box key={post.id} flexDirection="column" marginBottom={1}>
            <Text color={selected ? 'green' : 'blue'} bold={selected}>
              {post.title}
            </Text>
            {post.hasImage ? <ImageTag /> : null}
            <RowText selected={selected} dim>
              {metaText(post)}
            </RowText>
          </Box>
        );
      })}
      {truncatedPreview !== undefined ? <Text dimColor>{truncatedPreview}</Text> : null}
      {hasBelow ? <Text dimColor>{`↓ ${posts.length - end} more below`}</Text> : null}
    </Box>
  );
}
