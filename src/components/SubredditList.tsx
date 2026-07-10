import React from 'react';
import { Box, Text } from 'ink';
import { useListNav } from '../hooks/useListNav';
import { RowText } from './RowText';
import type { RedditSubreddit } from '../reddit/types';

export type SubredditListProps = {
  subreddits: RedditSubreddit[];
  onSelect: (subreddit: RedditSubreddit) => void;
  onReachEnd: () => void;
  emptyMessage: string;
};

export function SubredditList({
  subreddits,
  onSelect,
  onReachEnd,
  emptyMessage,
}: SubredditListProps): React.ReactElement {
  const { selectedIndex } = useListNav({ items: subreddits, onActivate: onSelect, onReachEnd });

  if (subreddits.length === 0) {
    return <Text>{emptyMessage}</Text>;
  }

  return (
    <Box flexDirection="column">
      {subreddits.map((subreddit, index) => {
        const selected = index === selectedIndex;
        return (
          <Box key={subreddit.name} flexDirection="column" marginBottom={1}>
            <Text color={selected ? 'green' : 'blue'} bold={selected}>
              {`r/${subreddit.name}`}
            </Text>
            <RowText selected={selected} dim>
              {`${subreddit.subscribers.toLocaleString()} subscribers · ${subreddit.title}`}
            </RowText>
          </Box>
        );
      })}
    </Box>
  );
}
