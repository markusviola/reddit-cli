// src/screens/SubredditSearchScreen.tsx
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useNav } from '../nav/stack';
import { SubredditList } from '../components/SubredditList';
import { searchSubreddits } from '../reddit/client';
import type { RedditSubreddit } from '../reddit/types';

export function SubredditSearchScreen(): React.ReactElement {
  const { push } = useNav();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [subreddits, setSubreddits] = useState<RedditSubreddit[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const runSearch = (searchQuery: string, pageAfter: string | null): void => {
    setStatus('loading');
    async function run(): Promise<void> {
      try {
        const listing = await searchSubreddits(searchQuery, pageAfter);
        setSubreddits((previous) => (pageAfter === null ? listing.children : [...previous, ...listing.children]));
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
    setSubreddits([]);
    setAfter(null);
    runSearch(value, null);
  };

  return (
    <Box flexDirection="column">
      <Text bold>Search Subreddits</Text>
      {submittedQuery === null ? (
        <Box>
          <Text>Query: </Text>
          <TextInput value={query} onChange={setQuery} onSubmit={handleSubmit} />
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text>{`Results for "${submittedQuery}"`}</Text>
          {status === 'error' ? <Text color="red">Search failed. Press Backspace and try again.</Text> : null}
          {status === 'loading' && subreddits.length === 0 ? (
            <Text>Loading...</Text>
          ) : (
            <SubredditList
              subreddits={subreddits}
              onSelect={(subreddit) => push({ screen: 'Feed', subreddit: subreddit.name })}
              onReachEnd={() => runSearch(submittedQuery, after)}
              emptyMessage="No subreddits found."
            />
          )}
        </Box>
      )}
    </Box>
  );
}
