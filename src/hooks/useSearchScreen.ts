import { useEffect, useRef, useState } from 'react';
import { useInput } from 'ink';
import { useNav } from '../nav/stack';
import type { Listing } from '../reddit/types';

export type SearchFocus = 'query' | 'return';

export type UseSearchScreenResult<T> = {
  query: string;
  setQuery: (value: string) => void;
  submittedQuery: string | null;
  items: T[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  handleSubmit: (value: string) => void;
  handleReachEnd: () => void;
  focus: SearchFocus;
};

export function useSearchScreen<T>(
  search: (query: string, after: string | null) => Promise<Listing<T>>,
  initialQuery = ''
): UseSearchScreenResult<T> {
  const { pop, setBackspaceConsumed } = useNav();
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [items, setItems] = useState<T[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [focus, setFocus] = useState<SearchFocus>('query');
  const submittedQueryRef = useRef(submittedQuery);

  useEffect(() => {
    submittedQueryRef.current = submittedQuery;
  });

  useEffect(() => {
    setBackspaceConsumed(submittedQuery !== null || query.length > 0);
    return () => setBackspaceConsumed(false);
  }, [submittedQuery, query, setBackspaceConsumed]);

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

  return { query, setQuery, submittedQuery, items, status, handleSubmit, handleReachEnd, focus };
}
