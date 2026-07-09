// src/screens/FeedScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useNav } from '../nav/stack';
import { PostList } from '../components/PostList';
import { getHomeFeed, getSubredditFeed } from '../reddit/client';
import type { FeedSort } from '../reddit/client';
import type { RedditPost } from '../reddit/types';

const SORTS: FeedSort[] = ['hot', 'top', 'new', 'controversial'];

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
  const [lastFeedKey, setLastFeedKey] = useState(feedKey);

  if (lastFeedKey !== feedKey) {
    setLastFeedKey(feedKey);
    setStatus('loading');
  }

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
      setSortIndex((index) => (index + 1) % SORTS.length);
    }
  });

  const loadMore = (): void => {
    if (after === null) return;
    async function run(): Promise<void> {
      const listing = await fetchPage(subreddit, sort, after);
      setPosts((previous) => [...previous, ...listing.children]);
      setAfter(listing.after);
    }
    void run();
  };

  return (
    <Box flexDirection="column">
      <Text bold>
        {subreddit === null ? 'Home Feed' : `r/${subreddit}`} — sort: {sort} (press s to cycle)
      </Text>
      {status === 'error' ? <Text color="red">Failed to load. Press Backspace and try again.</Text> : null}
      {status === 'loading' ? (
        <Text>Loading...</Text>
      ) : (
        <PostList
          posts={posts}
          onSelect={(post) => push({ screen: 'Thread', subreddit: post.subreddit, postId: post.id })}
          onReachEnd={loadMore}
          emptyMessage="No posts found."
        />
      )}
    </Box>
  );
}
