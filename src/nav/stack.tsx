import React, { createContext, useCallback, useContext, useReducer, useRef } from 'react';
import { useInput, useApp } from 'ink';
import { stackReducer } from './stackReducer';
import type { StackAction } from './stackReducer';
import type { RedditPost, RedditSubreddit } from '../reddit/types';

export type SearchState<T> = {
  query: string;
  submittedQuery: string | null;
  items: T[];
  after: string | null;
};

export type Frame =
  | { screen: 'MainMenu' }
  | { screen: 'Feed'; subreddit: string | null }
  | { screen: 'SubredditSearch'; search?: SearchState<RedditSubreddit> }
  | { screen: 'JoinedSubreddits' }
  | { screen: 'GlobalSearch'; search?: SearchState<RedditPost> }
  | { screen: 'Thread'; subreddit: string; postId: string };

export type NavContextValue = {
  frame: Frame;
  push: (frame: Frame) => void;
  pop: () => void;
  updateFrame: (updater: (frame: Frame) => Frame) => void;
  setBackspaceConsumed: (consumed: boolean) => void;
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
  const backspaceConsumedRef = useRef(false);

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
      if (!backspaceConsumedRef.current) {
        dispatch({ type: 'pop' });
      }
    }
  });

  const push = useCallback((frame: Frame) => dispatch({ type: 'push', frame }), []);
  const pop = useCallback(() => dispatch({ type: 'pop' }), []);
  const updateFrame = useCallback(
    (updater: (frame: Frame) => Frame) => dispatch({ type: 'update', updater }),
    []
  );
  const setBackspaceConsumed = useCallback((consumed: boolean) => {
    backspaceConsumedRef.current = consumed;
  }, []);

  const currentFrame = stack[stack.length - 1];
  if (currentFrame === undefined) throw new Error('unreachable: stack is never empty');

  const value: NavContextValue = {
    frame: currentFrame,
    push,
    pop,
    updateFrame,
    setBackspaceConsumed,
  };

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const context = useContext(NavContext);
  if (context === null) throw new Error('useNav must be used within NavProvider');
  return context;
}
