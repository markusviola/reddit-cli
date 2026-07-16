// src/screens/ThreadScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { CommentTree } from '../components/CommentTree';
import { ImageTag } from '../components/ImageTag';
import { useAvailableHeight } from '../hooks/useAvailableHeight';
import { estimateWrappedLines } from '../rendering/textMetrics';
import { getThread, loadMoreChildren } from '../reddit/client';
import type { RedditPost, RedditThing } from '../reddit/types';
import type { CommentRow } from '../comments/flatten';

const EXPAND_FAILED_TEXT = 'Failed to load replies. Press Enter to retry.';

/** Blank line separating the header from the content below it. */
const HEADER_GAP_LINES = 1;

export type ThreadScreenProps = {
  subreddit: string;
  postId: string;
};

function replaceMoreStub(things: RedditThing[], stubId: string, replacement: RedditThing[]): RedditThing[] {
  return things.flatMap((thing) => {
    if (thing.kind === 'more' && thing.id === stubId) return replacement;
    if (thing.kind === 'comment') {
      return [{ ...thing, replies: replaceMoreStub(thing.replies, stubId, replacement) }];
    }
    return [thing];
  });
}

export function ThreadScreen({ subreddit, postId }: ThreadScreenProps): React.ReactElement {
  const [post, setPost] = useState<RedditPost | null>(null);
  const [comments, setComments] = useState<RedditThing[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [expandFailed, setExpandFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run(): Promise<void> {
      try {
        const thread = await getThread(subreddit, postId);
        if (cancelled) return;
        setPost(thread.post);
        setComments(thread.comments);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [subreddit, postId]);

  const handleExpandMore = (row: CommentRow): void => {
    if (row.content.type !== 'more' || post === null) return;
    const stubId = row.id.slice('more:'.length);
    const childIds = row.content.childIds;
    const currentPost = post;
    setExpandFailed(false);
    async function run(): Promise<void> {
      try {
        const fetched = await loadMoreChildren(`t3_${currentPost.id}`, childIds);
        setComments((previous) => replaceMoreStub(previous, stubId, fetched));
      } catch {
        setExpandFailed(true);
      }
    }
    void run();
  };

  const { availableHeight } = useAvailableHeight((columns) => {
    if (post === null) return 0;
    const titleLines = estimateWrappedLines(post.title, columns);
    const imageLines = post.hasImage ? 1 : 0;
    const metaLines = estimateWrappedLines(`r/${post.subreddit} · u/${post.author} · ${post.score} pts`, columns);
    const expandFailedLines = expandFailed ? estimateWrappedLines(EXPAND_FAILED_TEXT, columns) : 0;
    return titleLines + imageLines + metaLines + expandFailedLines + HEADER_GAP_LINES;
  });

  if (status === 'loading') return <Text>Loading...</Text>;
  if (status === 'error' || post === null) {
    return <Text color="red">Failed to load thread. Press Backspace and try again.</Text>;
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text color="blue" bold>
          {post.title}
        </Text>
        {post.hasImage ? <ImageTag /> : null}
        <Text dimColor>{`r/${post.subreddit} · u/${post.author} · ${post.score} pts`}</Text>
        {expandFailed ? <Text color="red">{EXPAND_FAILED_TEXT}</Text> : null}
      </Box>
      <CommentTree
        postBody={post.selftext}
        comments={comments}
        onExpandMore={handleExpandMore}
        availableHeight={availableHeight}
      />
    </Box>
  );
}
