import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useInput } from 'ink';
import { selectionReducer } from './selectionReducer';

export type UseListNavOptions<T> = {
  items: T[];
  onActivate: (item: T, index: number) => void;
  onReachEnd?: () => void;
};

export type UseListNavResult = {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
};

export function useListNav<T>({ items, onActivate, onReachEnd }: UseListNavOptions<T>): UseListNavResult {
  const [state, dispatch] = useReducer(selectionReducer, { index: 0 });
  const onReachEndRef = useRef(onReachEnd);

  useEffect(() => {
    onReachEndRef.current = onReachEnd;
  });

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
    if (onReachEndRef.current !== undefined && items.length > 0 && state.index >= items.length - 1) {
      onReachEndRef.current();
    }
  }, [state.index, items.length]);

  const setSelectedIndex = useCallback((index: number): void => {
    dispatch({ type: 'set', index });
  }, []);

  return { selectedIndex: state.index, setSelectedIndex };
}
