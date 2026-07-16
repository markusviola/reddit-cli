// src/screens/SubredditSearchScreen.tsx
import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useNav } from '../nav/stack';
import { SubredditList } from '../components/SubredditList';
import { useAvailableHeight } from '../hooks/useAvailableHeight';
import { estimateWrappedLines } from '../rendering/textMetrics';
import { searchSubreddits } from '../reddit/client';
import { useSearchScreen } from '../hooks/useSearchScreen';

const TITLE_TEXT = 'Search Subreddits';
const SEARCH_FAILED_TEXT = 'Search failed. Press Backspace and try again.';

/** Blank line + "Return" row shown below the query input. */
const RETURN_BUTTON_LINES = 2;

export function SubredditSearchScreen(): React.ReactElement {
  const { frame, push, updateFrame } = useNav();
  const initialState = frame.screen === 'SubredditSearch' ? frame.search : undefined;
  const { query, setQuery, submittedQuery, items, after, status, handleSubmit, handleReachEnd, focus } =
    useSearchScreen(searchSubreddits, initialState);

  const { availableHeight } = useAvailableHeight((columns) => {
    const titleLines = estimateWrappedLines(TITLE_TEXT, columns);
    if (submittedQuery === null) {
      const queryLines = estimateWrappedLines(`Query: ${query}`, columns);
      return titleLines + queryLines + RETURN_BUTTON_LINES;
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
      </Box>
      {submittedQuery === null ? null : status === 'loading' && items.length === 0 ? (
        <Text>Loading...</Text>
      ) : (
        <SubredditList
          subreddits={items}
          onSelect={(subreddit) => {
            updateFrame((current) =>
              current.screen === 'SubredditSearch'
                ? { ...current, search: { query, submittedQuery, items, after } }
                : current
            );
            push({ screen: 'Feed', subreddit: subreddit.name });
          }}
          onReachEnd={handleReachEnd}
          emptyMessage="No subreddits found."
          availableHeight={availableHeight}
        />
      )}
    </Box>
  );
}
