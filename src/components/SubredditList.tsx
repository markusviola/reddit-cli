import React from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { useListNav } from '../hooks/useListNav';
import { RowText } from './RowText';
import { computeVisibleWindowWithIndicators } from '../hooks/windowing';
import { estimateWrappedLines } from '../rendering/textMetrics';
import type { RedditSubreddit } from '../reddit/types';

export type SubredditListProps = {
  subreddits: RedditSubreddit[];
  onSelect: (subreddit: RedditSubreddit) => void;
  onReachEnd: () => void;
  emptyMessage: string;
  availableHeight: number;
};

function metaText(subreddit: RedditSubreddit): string {
  return `${subreddit.subscribers.toLocaleString()} subscribers · ${subreddit.title}`;
}

function estimateSubredditHeight(subreddit: RedditSubreddit, columns: number): number {
  const titleLines = estimateWrappedLines(`r/${subreddit.name}`, columns);
  const metaLines = estimateWrappedLines(metaText(subreddit), columns);
  return titleLines + metaLines + 1;
}

export function SubredditList({
  subreddits,
  onSelect,
  onReachEnd,
  emptyMessage,
  availableHeight,
}: SubredditListProps): React.ReactElement {
  const { selectedIndex } = useListNav({ items: subreddits, onActivate: onSelect, onReachEnd });
  const { columns } = useWindowSize();

  if (subreddits.length === 0) {
    return <Text>{emptyMessage}</Text>;
  }

  const itemHeights = subreddits.map((subreddit) => estimateSubredditHeight(subreddit, columns));
  const { start, end, hasAbove, hasBelow } = computeVisibleWindowWithIndicators(
    subreddits.length,
    selectedIndex,
    itemHeights,
    availableHeight
  );

  return (
    <Box flexDirection="column">
      {hasAbove ? <Text dimColor>{`↑ ${start} more above`}</Text> : null}
      {subreddits.slice(start, end).map((subreddit, offset) => {
        const index = start + offset;
        const selected = index === selectedIndex;
        return (
          <Box key={subreddit.name} flexDirection="column" marginBottom={1}>
            <Text color={selected ? 'green' : 'blue'} bold={selected}>
              {`r/${subreddit.name}`}
            </Text>
            <RowText selected={selected} dim>
              {metaText(subreddit)}
            </RowText>
          </Box>
        );
      })}
      {hasBelow ? <Text dimColor>{`↓ ${subreddits.length - end} more below`}</Text> : null}
    </Box>
  );
}
