// src/App.tsx
import React from 'react';
import { NavProvider, useNav } from './nav/stack';
import { MainMenu } from './screens/MainMenu';
import { FeedScreen } from './screens/FeedScreen';
import { SubredditSearchScreen } from './screens/SubredditSearchScreen';
import { JoinedSubredditsScreen } from './screens/JoinedSubredditsScreen';
import { GlobalSearchScreen } from './screens/GlobalSearchScreen';
import { ThreadScreen } from './screens/ThreadScreen';

export function App(): React.ReactElement {
  return (
    <NavProvider>
      <ScreenSwitch />
    </NavProvider>
  );
}

function ScreenSwitch(): React.ReactElement {
  const { frame } = useNav();
  switch (frame.screen) {
    case 'MainMenu':
      return <MainMenu />;
    case 'Feed':
      return <FeedScreen subreddit={frame.subreddit} />;
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
