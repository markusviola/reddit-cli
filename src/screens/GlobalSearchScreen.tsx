// src/screens/GlobalSearchScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useNav } from '../nav/stack';
import { PostList } from '../components/PostList';
import { searchPosts } from '../reddit/client';
import type { RedditPost } from '../reddit/types';

export function GlobalSearchScreen(): React.ReactElement {
  const { push, setBackspaceConsumed } = useNav();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    setBackspaceConsumed(submittedQuery !== null || query.length > 0);
    return () => setBackspaceConsumed(false);
  }, [submittedQuery, query, setBackspaceConsumed]);

  useInput((_input, key) => {
    if ((key.backspace || key.delete) && submittedQuery !== null) {
      setSubmittedQuery(null);
    }
  });

  const runSearch = (searchQuery: string, pageAfter: string | null): void => {
    setStatus('loading');
    async function run(): Promise<void> {
      try {
        const listing = await searchPosts(searchQuery, pageAfter);
        setPosts((previous) => (pageAfter === null ? listing.children : [...previous, ...listing.children]));
        setAfter(listing.after);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }
    void run();
  };

  const handleSubmit = (value: string): void => {
    setSubmittedQuery(value);
    setPosts([]);
    setAfter(null);
    runSearch(value, null);
  };

  return (
    <Box flexDirection="column">
      <Text bold>Global Search</Text>
      {submittedQuery === null ? (
        <Box>
          <Text>Query: </Text>
          <TextInput value={query} onChange={setQuery} onSubmit={handleSubmit} />
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text>{`Results for "${submittedQuery}"`}</Text>
          {status === 'error' ? <Text color="red">Search failed. Press Backspace and try again.</Text> : null}
          {status === 'loading' && posts.length === 0 ? (
            <Text>Loading...</Text>
          ) : (
            <PostList
              posts={posts}
              onSelect={(post) => push({ screen: 'Thread', subreddit: post.subreddit, postId: post.id })}
              onReachEnd={() => {
                if (after !== null) runSearch(submittedQuery, after);
              }}
              emptyMessage="No posts found."
            />
          )}
        </Box>
      )}
    </Box>
  );
}
