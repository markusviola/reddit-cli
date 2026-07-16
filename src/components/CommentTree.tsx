import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { flattenVisibleComments, nearestAnchorId } from '../comments/flatten';
import { branchPrefix, continuationPrefix } from '../comments/render';
import { usernameColor } from '../colors';
import { useListNav } from '../hooks/useListNav';
import { RowText } from './RowText';
import { useVisibleWindow } from '../hooks/useVisibleWindow';
import { estimateWrappedLines } from '../rendering/textMetrics';
import { chunkText } from '../rendering/postChunks';
import type { CommentRow } from '../comments/flatten';
import type { RedditThing } from '../reddit/types';

export type CommentTreeProps = {
  postBody: string;
  comments: RedditThing[];
  onExpandMore: (row: CommentRow) => void;
  availableHeight: number;
};

// Long post bodies used to render as an unbounded fixed header above
// the comment tree, pushing the whole viewport past the post itself.
// Chunking the post body into rows in the same scrollable/selectable
// list as the comments keeps the top of the post reachable by
// scrolling sticky selection like everything else.
const POST_CHUNK_MAX_LINES = 8;

type TreeRow =
  | { kind: 'text'; id: string; text: string; dim: boolean; bold: boolean }
  | { kind: 'comment'; id: string; row: CommentRow };

function estimateCommentHeight(row: CommentRow, columns: number): number {
  if (row.content.type === 'collapsedReplies' || row.content.type === 'more') {
    return 1;
  }
  const prefixWidth = branchPrefix(row).length;
  const bodyWidth = Math.max(1, columns - prefixWidth);
  const bodyLines = estimateWrappedLines(row.content.body, bodyWidth);
  const margin = row.depth === 0 ? 1 : 0;
  return 1 + bodyLines + margin;
}

function estimateRowHeight(row: TreeRow, columns: number): number {
  return row.kind === 'text' ? estimateWrappedLines(row.text, columns) + 1 : estimateCommentHeight(row.row, columns);
}

export function CommentTree({ postBody, comments, onExpandMore, availableHeight }: CommentTreeProps): React.ReactElement {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const { columns } = useWindowSize();
  const commentRows = flattenVisibleComments(comments, expandedIds);

  const leadingRows: TreeRow[] = chunkText(postBody, columns, POST_CHUNK_MAX_LINES).map((text, index) => ({
    kind: 'text',
    id: `post:${index}`,
    text,
    dim: false,
    bold: false,
  }));
  leadingRows.push({ kind: 'text', id: 'comments-heading', text: 'Comments', dim: false, bold: true });
  if (commentRows.length === 0) {
    leadingRows.push({ kind: 'text', id: 'no-comments', text: 'No comments yet.', dim: true, bold: false });
  }
  const leadingCount = leadingRows.length;
  const rows: TreeRow[] = [...leadingRows, ...commentRows.map((row) => ({ kind: 'comment' as const, id: row.id, row }))];

  const { selectedIndex, setSelectedIndex } = useListNav<TreeRow>({
    items: rows,
    onActivate: (item) => {
      if (item.kind !== 'comment') return;
      const row = item.row;
      if (row.content.type === 'collapsedReplies') {
        const sourceId = row.id.slice('collapsed:'.length);
        setExpandedIds((previous) => new Set([...previous, sourceId]));
      } else if (row.content.type === 'more') {
        onExpandMore(row);
      }
    },
  });

  const liveRef = useRef({ commentRows, selectedIndex, leadingCount });
  const anchorIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    liveRef.current = { commentRows, selectedIndex, leadingCount };
  });

  useEffect(() => {
    const anchorId = anchorIdRef.current;
    if (anchorId === undefined) return;
    const { commentRows: currentCommentRows, selectedIndex: currentIndex, leadingCount: currentLeadingCount } =
      liveRef.current;
    const matchedCommentIndex = currentCommentRows.findIndex((row) => row.id === anchorId);
    if (matchedCommentIndex === -1) return;
    const matchedIndex = currentLeadingCount + matchedCommentIndex;
    if (matchedIndex !== currentIndex) {
      setSelectedIndex(matchedIndex);
    }
  }, [comments, expandedIds, setSelectedIndex]);

  useEffect(() => {
    const commentSelectedIndex = selectedIndex - leadingCount;
    anchorIdRef.current = commentSelectedIndex >= 0 ? nearestAnchorId(commentRows, commentSelectedIndex) : undefined;
  });

  const itemHeights = rows.map((row) => estimateRowHeight(row, columns));
  const { start, end, hasAbove, hasBelow } = useVisibleWindow(rows.length, selectedIndex, itemHeights, availableHeight);

  return (
    <Box flexDirection="column">
      {hasAbove ? <Text dimColor>{`↑ ${start} more above`}</Text> : null}
      {rows.slice(start, end).map((row, offset) => {
        const index = start + offset;
        const selected = index === selectedIndex;
        return row.kind === 'text' ? (
          <TextRowView key={row.id} text={row.text} dim={row.dim} bold={row.bold} selected={selected} />
        ) : (
          <CommentRowView key={row.id} row={row.row} selected={selected} />
        );
      })}
      {hasBelow ? <Text dimColor>{`↓ ${rows.length - end} more below`}</Text> : null}
    </Box>
  );
}

function TextRowView({
  text,
  selected,
  dim,
  bold,
}: {
  text: string;
  selected: boolean;
  dim: boolean;
  bold: boolean;
}): React.ReactElement {
  return (
    <Box marginBottom={1}>
      <Text bold={selected || bold} dimColor={!selected && dim} {...(selected ? { color: 'green' as const } : {})}>
        {text}
      </Text>
    </Box>
  );
}

function CommentRowView({ row, selected }: { row: CommentRow; selected: boolean }): React.ReactElement {
  const prefix = branchPrefix(row);

  if (row.content.type === 'collapsedReplies') {
    return <RowText selected={selected}>{`${prefix}${row.content.replyCount} replies ▸`}</RowText>;
  }

  if (row.content.type === 'more') {
    return <RowText selected={selected}>{`${prefix}${row.content.count} more replies ▸`}</RowText>;
  }

  const bodyPrefix = continuationPrefix(row, row.content.continuesBelow);
  const authorColor = selected ? 'green' : usernameColor(row.content.author);

  return (
    <Box flexDirection="column" marginBottom={row.depth === 0 ? 1 : 0}>
      <Box>
        <RowText selected={selected}>{prefix}</RowText>
        <Text color={authorColor} bold={selected}>
          {`u/${row.content.author}`}
        </Text>
        <RowText selected={selected}>{` (${row.content.score} pts)`}</RowText>
      </Box>
      <RowText selected={selected}>
        {bodyPrefix}
        {row.content.body}
      </RowText>
    </Box>
  );
}
