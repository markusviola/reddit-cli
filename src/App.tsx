// src/App.tsx
import React from 'react';
import { Text } from 'ink';
import { NavProvider, useNav } from './nav/stack';
import { MainMenu } from './screens/MainMenu';
import { FeedScreen } from './screens/FeedScreen';

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
    default:
      return <Text>Coming soon: {frame.screen} (press Backspace to go back)</Text>;
  }
}
