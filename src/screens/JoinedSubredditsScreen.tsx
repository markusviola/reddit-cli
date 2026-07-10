// src/screens/JoinedSubredditsScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { useNav } from '../nav/stack';
import { SubredditList } from '../components/SubredditList';
import { getJoinedSubreddits } from '../reddit/client';
import type { RedditSubreddit } from '../reddit/types';

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

  return (
    <Box flexDirection="column">
      <Text bold>Joined Subreddits</Text>
      {status === 'error' ? <Text color="red">Failed to load. Press Backspace and try again.</Text> : null}
      {status === 'loading' ? (
        <Text>Loading...</Text>
      ) : (
        <SubredditList
          subreddits={subreddits}
          onSelect={(subreddit) => push({ screen: 'Feed', subreddit: subreddit.name })}
          onReachEnd={loadMore}
          emptyMessage="You haven't joined any subreddits."
        />
      )}
    </Box>
  );
}
