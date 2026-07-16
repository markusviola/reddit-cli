// src/App.tsx
import React from 'react';
import { Box } from 'ink';
import { NavProvider, useNav } from './nav/stack';
import { Footer } from './components/Footer';
import { FeedScreen } from './screens/FeedScreen';
import { SubredditSearchScreen } from './screens/SubredditSearchScreen';
import { JoinedSubredditsScreen } from './screens/JoinedSubredditsScreen';
import { GlobalSearchScreen } from './screens/GlobalSearchScreen';
import { ThreadScreen } from './screens/ThreadScreen';

export function App(): React.ReactElement {
  return (
    <NavProvider>
      <Box flexDirection="column">
        <ScreenSwitch />
        <Footer />
      </Box>
    </NavProvider>
  );
}

function ScreenSwitch(): React.ReactElement {
  const { frame } = useNav();
  switch (frame.screen) {
    case 'Feed':
      return <FeedScreen key={frame.subreddit ?? ''} subreddit={frame.subreddit} />;
    case 'SubredditSearch':
      return <SubredditSearchScreen />;
    case 'JoinedSubreddits':
      return <JoinedSubredditsScreen />;
    case 'GlobalSearch':
      return <GlobalSearchScreen />;
    case 'Thread':
      return <ThreadScreen subreddit={frame.subreddit} postId={frame.postId} />;
    default: {
      const exhaustiveCheck: never = frame;
      throw new Error(`Unhandled screen: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}
