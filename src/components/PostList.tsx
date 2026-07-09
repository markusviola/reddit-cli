import React from 'react';
import { Box, Text } from 'ink';
import { useListNav } from '../hooks/useListNav';
import { ImageTag } from './ImageTag';
import type { RedditPost } from '../reddit/types';

export type PostListProps = {
  posts: RedditPost[];
  onSelect: (post: RedditPost) => void;
  onReachEnd: () => void;
  emptyMessage: string;
};

export function PostList({ posts, onSelect, onReachEnd, emptyMessage }: PostListProps): React.ReactElement {
  const { selectedIndex } = useListNav({ items: posts, onActivate: onSelect, onReachEnd });

  if (posts.length === 0) {
    return <Text>{emptyMessage}</Text>;
  }

  return (
    <Box flexDirection="column">
      {posts.map((post, index) => {
        const selected = index === selectedIndex;
        return (
          <Box key={post.id} flexDirection="column" marginBottom={1}>
            <Text color={selected ? 'green' : 'blue'} bold={selected}>
              {post.title}
            </Text>
            {post.hasImage ? <ImageTag /> : null}
            {selected ? (
              <Text color="green" bold>
                {`r/${post.subreddit} · u/${post.author} · ${post.score} pts · ${post.numComments} comments`}
              </Text>
            ) : (
              <Text dimColor>
                {`r/${post.subreddit} · u/${post.author} · ${post.score} pts · ${post.numComments} comments`}
              </Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
