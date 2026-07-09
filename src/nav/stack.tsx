import React, { createContext, useContext, useReducer, useRef } from 'react';
import { useInput, useApp } from 'ink';
import { stackReducer } from './stackReducer';
import type { StackAction } from './stackReducer';

export type Frame =
  | { screen: 'MainMenu' }
  | { screen: 'Feed'; subreddit: string | null }
  | { screen: 'SubredditSearch' }
  | { screen: 'JoinedSubreddits' }
  | { screen: 'GlobalSearch' }
  | { screen: 'Thread'; subreddit: string; postId: string };

export type NavContextValue = {
  frame: Frame;
  push: (frame: Frame) => void;
  pop: () => void;
};

const NavContext = createContext<NavContextValue | null>(null);

const ROOT_FRAME: Frame = { screen: 'MainMenu' };

export function NavProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [stack, dispatch] = useReducer(
    (state: Frame[], action: StackAction<Frame>) => stackReducer(state, action),
    [ROOT_FRAME]
  );
  const { exit } = useApp();
  const lastCtrlCAt = useRef(0);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      const now = Date.now();
      if (now - lastCtrlCAt.current < 1000) {
        exit();
      } else {
        lastCtrlCAt.current = now;
      }
      return;
    }
    if (key.backspace || key.delete) {
      dispatch({ type: 'pop' });
    }
  });

  const currentFrame = stack[stack.length - 1];
  if (currentFrame === undefined) throw new Error('unreachable: stack is never empty');

  const value: NavContextValue = {
    frame: currentFrame,
    push: (frame) => dispatch({ type: 'push', frame }),
    pop: () => dispatch({ type: 'pop' }),
  };

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const context = useContext(NavContext);
  if (context === null) throw new Error('useNav must be used within NavProvider');
  return context;
}
