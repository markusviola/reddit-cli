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

/** Blank line + "Return" row shown below the query input. */
const RETURN_BUTTON_LINES = 2;

/** Blank line separating the header from the content below it. */
const HEADER_GAP_LINES = 1;

export function GlobalSearchScreen(): React.ReactElement {
  const { frame, push, updateFrame } = useNav();
  const initialState = frame.screen === 'GlobalSearch' ? frame.search : undefined;
  const { query, setQuery, submittedQuery, items, after, status, handleSubmit, handleReachEnd, focus } =
    useSearchScreen(searchPosts, initialState);

  const { availableHeight } = useAvailableHeight((columns) => {
    const titleLines = estimateWrappedLines(TITLE_TEXT, columns);
    if (submittedQuery === null) {
      const queryLines = estimateWrappedLines(`Query: ${query}`, columns);
      return titleLines + queryLines + RETURN_BUTTON_LINES + HEADER_GAP_LINES;
    }
    const resultsLines = estimateWrappedLines(`Results for "${submittedQuery}"`, columns);
    const errorLines = status === 'error' ? estimateWrappedLines(SEARCH_FAILED_TEXT, columns) : 0;
    return titleLines + resultsLines + errorLines + HEADER_GAP_LINES;
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>{TITLE_TEXT}</Text>
      </Box>
      {submittedQuery === null ? (
        <Box flexDirection="column">
          <Box>
            <Text>Query: </Text>
            {focus === 'query' ? (
              <TextInput value={query} onChange={setQuery} onSubmit={handleSubmit} />
            ) : (
              <Text>{query}</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <Text bold={focus === 'return'} {...(focus === 'return' ? { color: 'green' as const } : {})}>
              Return
            </Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text>{`Results for "${submittedQuery}"`}</Text>
          {status === 'error' ? <Text color="red">{SEARCH_FAILED_TEXT}</Text> : null}
        </Box>
      )}
      {submittedQuery === null ? null : status === 'loading' && items.length === 0 ? (
        <Text>Loading...</Text>
      ) : (
        <PostList
          posts={items}
          onSelect={(post) => {
            updateFrame((current) =>
              current.screen === 'GlobalSearch' ? { ...current, search: { query, submittedQuery, items, after } } : current
            );
            push({ screen: 'Thread', subreddit: post.subreddit, postId: post.id });
          }}
          onReachEnd={handleReachEnd}
          emptyMessage="No posts found."
          availableHeight={availableHeight}
        />
      )}
    </Box>
  );
}
