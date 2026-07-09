// src/screens/MainMenu.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { useNav } from '../nav/stack';
import { useListNav } from '../hooks/useListNav';

type MenuItem = {
  label: string;
  onSelect: () => void;
};

export function MainMenu(): React.ReactElement {
  const { push } = useNav();

  const items: MenuItem[] = [
    { label: 'Home Feed', onSelect: () => push({ screen: 'Feed', subreddit: null }) },
    { label: 'Search Subreddits', onSelect: () => push({ screen: 'SubredditSearch' }) },
    { label: 'Joined Subreddits', onSelect: () => push({ screen: 'JoinedSubreddits' }) },
    { label: 'Global Search', onSelect: () => push({ screen: 'GlobalSearch' }) },
  ];

  const { selectedIndex } = useListNav({ items, onActivate: (item) => item.onSelect() });

  return (
    <Box flexDirection="column">
      <Text bold>iudex-cli — Reddit Browser</Text>
      <Box marginTop={1} flexDirection="column">
        {items.map((item, index) =>
          index === selectedIndex ? (
            <Text key={item.label} color="green" bold>
              {item.label}
            </Text>
          ) : (
            <Text key={item.label}>{item.label}</Text>
          )
        )}
      </Box>
    </Box>
  );
}
