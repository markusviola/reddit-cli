import type { RedditThing } from '../reddit/types';

export type CommentRowContent =
  | { type: 'comment'; author: string; body: string; score: number; continuesBelow: boolean }
  | { type: 'collapsedReplies'; replyCount: number }
  | { type: 'more'; count: number; childIds: string[] };

export type CommentRow = {
  id: string;
  depth: number;
  isLastSibling: boolean;
  ancestorContinues: boolean[];
  content: CommentRowContent;
};

export function flattenVisibleComments(thread: RedditThing[], expandedIds: ReadonlySet<string>): CommentRow[] {
  const rows: CommentRow[] = [];
  walk(thread, 0, [], expandedIds, rows);
  return rows;
}

function walk(
  things: RedditThing[],
  depth: number,
  ancestorContinues: boolean[],
  expandedIds: ReadonlySet<string>,
  rows: CommentRow[]
): void {
  things.forEach((thing, index) => {
    const isLastSibling = index === things.length - 1;

    if (thing.kind === 'more') {
      rows.push({
        id: `more:${thing.id}`,
        depth,
        isLastSibling,
        ancestorContinues,
        content: { type: 'more', count: thing.count, childIds: thing.childIds },
      });
      return;
    }

    rows.push({
      id: thing.id,
      depth,
      isLastSibling,
      ancestorContinues,
      content: {
        type: 'comment',
        author: thing.author,
        body: thing.body,
        score: thing.score,
        continuesBelow: thing.replies.length > 0,
      },
    });

    if (thing.replies.length === 0) return;

    const childAncestors = [...ancestorContinues, !isLastSibling];
    if (expandedIds.has(thing.id)) {
      walk(thing.replies, depth + 1, childAncestors, expandedIds, rows);
    } else {
      rows.push({
        id: `collapsed:${thing.id}`,
        depth: depth + 1,
        isLastSibling: true,
        ancestorContinues: childAncestors,
        content: { type: 'collapsedReplies', replyCount: countLoadedReplies(thing.replies) },
      });
    }
  });
}

function countLoadedReplies(replies: RedditThing[]): number {
  return replies.reduce((total, reply) => (reply.kind === 'more' ? total + reply.count : total + 1), 0);
}
