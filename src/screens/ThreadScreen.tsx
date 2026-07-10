// src/screens/ThreadScreen.tsx
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { CommentTree } from '../components/CommentTree';
import { ImageTag } from '../components/ImageTag';
import { getThread, loadMoreChildren } from '../reddit/client';
import type { RedditPost, RedditThing } from '../reddit/types';
import type { CommentRow } from '../comments/flatten';

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
    async function run(): Promise<void> {
      const fetched = await loadMoreChildren(`t3_${currentPost.id}`, childIds);
      setComments((previous) => replaceMoreStub(previous, stubId, fetched));
    }
    void run();
  };

  if (status === 'loading') return <Text>Loading...</Text>;
  if (status === 'error' || post === null) {
    return <Text color="red">Failed to load thread. Press Backspace and try again.</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text color="blue" bold>
        {post.title}
      </Text>
      {post.hasImage ? <ImageTag /> : null}
      <Text dimColor>{`r/${post.subreddit} · u/${post.author} · ${post.score} pts`}</Text>
      {post.selftext.length > 0 ? <Text>{post.selftext}</Text> : null}
      <Box marginTop={1}>
        <Text bold>Comments</Text>
      </Box>
      <CommentTree comments={comments} onExpandMore={handleExpandMore} />
    </Box>
  );
}
