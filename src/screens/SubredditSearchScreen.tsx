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

export function SubredditSearchScreen(): React.ReactElement {
  const { push } = useNav();
  const { query, setQuery, submittedQuery, items, status, handleSubmit, handleReachEnd } =
    useSearchScreen(searchSubreddits);

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
        <SubredditList
          subreddits={items}
          onSelect={(subreddit) => push({ screen: 'Feed', subreddit: subreddit.name })}
          onReachEnd={handleReachEnd}
          emptyMessage="No subreddits found."
          availableHeight={availableHeight}
        />
      )}
    </Box>
  );
}
