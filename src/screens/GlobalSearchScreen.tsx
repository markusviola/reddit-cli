// src/screens/GlobalSearchScreen.tsx
import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useNav } from '../nav/stack';
import { PostList } from '../components/PostList';
import { useAvailableHeight } from '../hooks/useAvailableHeight';
import { estimateWrappedLines } from '../rendering/textMetrics';
import { searchPosts } from '../reddit/client';
import { useSearchScreen } from '../hooks/useSearchScreen';

const TITLE_TEXT = 'Global Search';
const SEARCH_FAILED_TEXT = 'Search failed. Press Backspace and try again.';

export function GlobalSearchScreen(): React.ReactElement {
  const { push } = useNav();
  const { query, setQuery, submittedQuery, items, status, handleSubmit, handleReachEnd } =
    useSearchScreen(searchPosts);

  const { availableHeight } = useAvailableHeight((columns) => {
    const titleLines = estimateWrappedLines(TITLE_TEXT, columns);
    if (submittedQuery === null) {
      return titleLines + estimateWrappedLines(`Query: ${query}`, columns);
    }
    const resultsLines = estimateWrappedLines(`Results for "${submittedQuery}"`, columns);
    const errorLines = status === 'error' ? estimateWrappedLines(SEARCH_FAILED_TEXT, columns) : 0;
    return titleLines + resultsLines + errorLines;
  });

  return (
    <Box flexDirection="column">
      <Box flexDirection="column">
        <Text bold>{TITLE_TEXT}</Text>
        {submittedQuery === null ? (
          <Box>
            <Text>Query: </Text>
            <TextInput value={query} onChange={setQuery} onSubmit={handleSubmit} />
          </Box>
        ) : (
          <Box flexDirection="column">
            <Text>{`Results for "${submittedQuery}"`}</Text>
            {status === 'error' ? <Text color="red">{SEARCH_FAILED_TEXT}</Text> : null}
          </Box>
        )}
      </Box>
      {submittedQuery === null ? null : status === 'loading' && items.length === 0 ? (
        <Text>Loading...</Text>
      ) : (
        <PostList
          posts={items}
          onSelect={(post) => push({ screen: 'Thread', subreddit: post.subreddit, postId: post.id })}
          onReachEnd={handleReachEnd}
          emptyMessage="No posts found."
          availableHeight={availableHeight}
        />
      )}
    </Box>
  );
}
