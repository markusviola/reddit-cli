// src/screens/JoinedSubredditsScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { useNav } from '../nav/stack';
import { SubredditList } from '../components/SubredditList';
import { useAvailableHeight } from '../hooks/useAvailableHeight';
import { estimateWrappedLines } from '../rendering/textMetrics';
import { getJoinedSubreddits } from '../reddit/client';
import type { RedditSubreddit } from '../reddit/types';

const TITLE_TEXT = 'Joined Subreddits';
const FAILED_TO_LOAD_TEXT = 'Failed to load. Press Backspace and try again.';

/** Blank line separating the header from the content below it. */
const HEADER_GAP_LINES = 1;

export function JoinedSubredditsScreen(): React.ReactElement {
  const { push } = useNav();
  const [subreddits, setSubreddits] = useState<RedditSubreddit[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    async function run(): Promise<void> {
      try {
        const listing = await getJoinedSubreddits(null);
        if (cancelled) return;
        setSubreddits(listing.children);
        setAfter(listing.after);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = (): void => {
    if (after === null) return;
    async function run(): Promise<void> {
      try {
        const listing = await getJoinedSubreddits(after);
        setSubreddits((previous) => [...previous, ...listing.children]);
        setAfter(listing.after);
      } catch {
        setStatus('error');
      }
    }
    void run();
  };

  const { availableHeight } = useAvailableHeight(
    (columns) =>
      estimateWrappedLines(TITLE_TEXT, columns) +
      (status === 'error' ? estimateWrappedLines(FAILED_TO_LOAD_TEXT, columns) : 0) +
      HEADER_GAP_LINES
  );

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold>{TITLE_TEXT}</Text>
        {status === 'error' ? <Text color="red">{FAILED_TO_LOAD_TEXT}</Text> : null}
      </Box>
      {status === 'loading' ? (
        <Text>Loading...</Text>
      ) : (
        <SubredditList
          subreddits={subreddits}
          onSelect={(subreddit) => push({ screen: 'Feed', subreddit: subreddit.name })}
          onReachEnd={loadMore}
          emptyMessage="You haven't joined any subreddits."
          availableHeight={availableHeight}
        />
      )}
    </Box>
  );
}
