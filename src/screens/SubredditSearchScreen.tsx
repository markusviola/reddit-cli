// src/screens/SubredditSearchScreen.tsx
import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useNav } from '../nav/stack';
import { SubredditList } from '../components/SubredditList';
import { searchSubreddits } from '../reddit/client';
import { useSearchScreen } from '../hooks/useSearchScreen';

export function SubredditSearchScreen(): React.ReactElement {
  const { push } = useNav();
  const { query, setQuery, submittedQuery, items, status, handleSubmit, handleReachEnd } =
    useSearchScreen(searchSubreddits);

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
          {status === 'loading' && items.length === 0 ? (
            <Text>Loading...</Text>
          ) : (
            <SubredditList
              subreddits={items}
              onSelect={(subreddit) => push({ screen: 'Feed', subreddit: subreddit.name })}
              onReachEnd={handleReachEnd}
              emptyMessage="No subreddits found."
            />
          )}
        </Box>
      )}
    </Box>
  );
}
