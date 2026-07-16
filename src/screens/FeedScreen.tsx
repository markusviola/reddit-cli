// src/screens/FeedScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useNav } from '../nav/stack';
import { PostList } from '../components/PostList';
import { useAvailableHeight } from '../hooks/useAvailableHeight';
import { estimateWrappedLines } from '../rendering/textMetrics';
import { getHomeFeed, getSubredditFeed } from '../reddit/client';
import type { FeedSort } from '../reddit/client';
import type { RedditPost } from '../reddit/types';

const FAILED_TO_LOAD_TEXT = 'Failed to load. Press Backspace and try again.';

const SORTS: FeedSort[] = ['hot', 'top', 'new', 'controversial'];

/** Blank line separating the header from the content below it. */
const HEADER_GAP_LINES = 1;

export type FeedScreenProps = {
  subreddit: string | null;
};

function fetchPage(subreddit: string | null, sort: FeedSort, after: string | null) {
  return subreddit === null ? getHomeFeed(sort, after) : getSubredditFeed(subreddit, sort, after);
}

export function FeedScreen({ subreddit }: FeedScreenProps): React.ReactElement {
  const { push } = useNav();
  const [sortIndex, setSortIndex] = useState(0);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const sort = SORTS[sortIndex] ?? 'hot';
  const feedKey = `${subreddit ?? ''}:${sort}`;
  const feedKeyRef = useRef(feedKey);

  useEffect(() => {
    feedKeyRef.current = feedKey;
  });

  useEffect(() => {
    let cancelled = false;
    async function run(): Promise<void> {
      try {
        const listing = await fetchPage(subreddit, sort, null);
        if (cancelled) return;
        setPosts(listing.children);
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
  }, [subreddit, sort]);

  useInput((input) => {
    if (input === 's') {
      setStatus('loading');
      setSortIndex((index) => (index + 1) % SORTS.length);
    }
  });

  const loadMore = (): void => {
    if (after === null) return;
    const requestKey = feedKey;
    async function run(): Promise<void> {
      try {
        const listing = await fetchPage(subreddit, sort, after);
        if (feedKeyRef.current !== requestKey) return;
        setPosts((previous) => [...previous, ...listing.children]);
        setAfter(listing.after);
      } catch {
        if (feedKeyRef.current === requestKey) setStatus('error');
      }
    }
    void run();
  };

  const titleText = `${subreddit === null ? 'Home Feed' : `r/${subreddit}`} — sort: ${sort} (press s to cycle)`;
  const { availableHeight } = useAvailableHeight(
    (columns) =>
      estimateWrappedLines(titleText, columns) +
      (status === 'error' ? estimateWrappedLines(FAILED_TO_LOAD_TEXT, columns) : 0) +
      HEADER_GAP_LINES
  );

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold>{titleText}</Text>
        {status === 'error' ? <Text color="red">{FAILED_TO_LOAD_TEXT}</Text> : null}
      </Box>
      {status === 'loading' ? (
        <Text>Loading...</Text>
      ) : (
        <PostList
          posts={posts}
          onSelect={(post) => push({ screen: 'Thread', subreddit: post.subreddit, postId: post.id })}
          onReachEnd={loadMore}
          emptyMessage="No posts found."
          availableHeight={availableHeight}
        />
      )}
    </Box>
  );
}
