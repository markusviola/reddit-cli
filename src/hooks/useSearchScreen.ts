import { useEffect, useRef, useState } from 'react';
import { useInput } from 'ink';
import { useNav } from '../nav/stack';
import type { SearchState } from '../nav/stack';
import type { Listing } from '../reddit/types';

export type SearchFocus = 'query' | 'return';

export type UseSearchScreenResult<T> = {
  query: string;
  setQuery: (value: string) => void;
  submittedQuery: string | null;
  items: T[];
  after: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  handleSubmit: (value: string) => void;
  handleReachEnd: () => void;
  focus: SearchFocus;
};

export function useSearchScreen<T>(
  search: (query: string, after: string | null) => Promise<Listing<T>>,
  initialState?: SearchState<T>
): UseSearchScreenResult<T> {
  const { pop, setBackspaceConsumed, setQueryInputActive } = useNav();
  const [query, setQuery] = useState(initialState?.query ?? '');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(initialState?.submittedQuery ?? null);
  const [items, setItems] = useState<T[]>(initialState?.items ?? []);
  const [after, setAfter] = useState<string | null>(initialState?.after ?? null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    initialState?.submittedQuery != null ? 'ready' : 'idle'
  );
  const [focus, setFocus] = useState<SearchFocus>('query');
  const submittedQueryRef = useRef(submittedQuery);

  useEffect(() => {
    submittedQueryRef.current = submittedQuery;
  });

  useEffect(() => {
    setBackspaceConsumed(submittedQuery !== null || query.length > 0);
    return () => setBackspaceConsumed(false);
  }, [submittedQuery, query, setBackspaceConsumed]);

  useEffect(() => {
    setQueryInputActive(submittedQuery === null && focus === 'query');
    return () => setQueryInputActive(false);
  }, [submittedQuery, focus, setQueryInputActive]);

  useInput((_input, key) => {
    if (key.backspace || key.delete) {
      if (submittedQuery !== null) setSubmittedQuery(null);
      return;
    }
    if (submittedQuery !== null) return;
    if (key.downArrow && focus === 'query') {
      setFocus('return');
    } else if (key.upArrow && focus === 'return') {
      setFocus('query');
    } else if (key.return && focus === 'return') {
      pop();
    }
  });

  const runSearch = (searchQuery: string, pageAfter: string | null): void => {
    setStatus('loading');
    async function run(): Promise<void> {
      try {
        const listing = await search(searchQuery, pageAfter);
        if (submittedQueryRef.current !== searchQuery) return;
        setItems((previous) => (pageAfter === null ? listing.children : [...previous, ...listing.children]));
        setAfter(listing.after);
        setStatus('ready');
      } catch {
        if (submittedQueryRef.current === searchQuery) setStatus('error');
      }
    }
    void run();
  };

  const handleSubmit = (value: string): void => {
    setSubmittedQuery(value);
    setItems([]);
    setAfter(null);
    runSearch(value, null);
  };

  const handleReachEnd = (): void => {
    if (after !== null && submittedQuery !== null) runSearch(submittedQuery, after);
  };

  return { query, setQuery, submittedQuery, items, after, status, handleSubmit, handleReachEnd, focus };
}
