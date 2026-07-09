import { useReducer, useEffect } from 'react';
import { useInput } from 'ink';
import { selectionReducer } from './selectionReducer';

export type UseListNavOptions<T> = {
  items: T[];
  onActivate: (item: T, index: number) => void;
  onReachEnd?: () => void;
};

export type UseListNavResult = {
  selectedIndex: number;
};

export function useListNav<T>({ items, onActivate, onReachEnd }: UseListNavOptions<T>): UseListNavResult {
  const [state, dispatch] = useReducer(selectionReducer, { index: 0 });

  useInput((_input, key) => {
    if (key.upArrow) {
      dispatch({ type: 'up' });
    } else if (key.downArrow) {
      dispatch({ type: 'down', itemCount: items.length });
    } else if (key.return) {
      const item = items[state.index];
      if (item !== undefined) onActivate(item, state.index);
    }
  });

  useEffect(() => {
    if (onReachEnd !== undefined && items.length > 0 && state.index >= items.length - 1) {
      onReachEnd();
    }
  }, [state.index, items.length, onReachEnd]);

  return { selectedIndex: state.index };
}
