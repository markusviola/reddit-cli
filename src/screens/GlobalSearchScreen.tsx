// src/screens/GlobalSearchScreen.tsx
import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useNav } from '../nav/stack';
import { PostList } from '../components/PostList';
import { searchPosts } from '../reddit/client';
import { useSearchScreen } from '../hooks/useSearchScreen';

export function GlobalSearchScreen(): React.ReactElement {
  const { push } = useNav();
  const { query, setQuery, submittedQuery, items, status, handleSubmit, handleReachEnd } =
    useSearchScreen(searchPosts);

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
          {status === 'loading' && items.length === 0 ? (
            <Text>Loading...</Text>
          ) : (
            <PostList
              posts={items}
              onSelect={(post) => push({ screen: 'Thread', subreddit: post.subreddit, postId: post.id })}
              onReachEnd={handleReachEnd}
              emptyMessage="No posts found."
            />
          )}
        </Box>
      )}
    </Box>
  );
}
