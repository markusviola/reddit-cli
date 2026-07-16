import React from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { useListNav } from '../hooks/useListNav';
import { RowText } from './RowText';
import { useVisibleWindow } from '../hooks/useVisibleWindow';
import { estimateWrappedLines, truncateToLines } from '../rendering/textMetrics';
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
  const itemHeights = subreddits.map((subreddit) => estimateSubredditHeight(subreddit, columns));
  const { start, end, hasAbove, hasBelow } = useVisibleWindow(
    subreddits.length,
    selectedIndex,
    itemHeights,
    availableHeight
  );

  if (subreddits.length === 0) {
    return <Text>{emptyMessage}</Text>;
  }

  const usedHeight = itemHeights.slice(start, end).reduce((sum, height) => sum + height, 0);
  const indicatorLines = (hasAbove ? 1 : 0) + (hasBelow ? 1 : 0);
  const remainingSlack = availableHeight - usedHeight - indicatorLines;
  const nextSubreddit = hasBelow ? subreddits[end] : undefined;
  const truncatedPreview =
    nextSubreddit !== undefined && remainingSlack > 0
      ? truncateToLines(`r/${nextSubreddit.name}`, columns, remainingSlack)
      : undefined;

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
      {truncatedPreview !== undefined ? <Text dimColor>{truncatedPreview}</Text> : null}
      {hasBelow ? <Text dimColor>{`↓ ${subreddits.length - end} more below`}</Text> : null}
    </Box>
  );
}
