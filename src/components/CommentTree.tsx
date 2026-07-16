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

// Long post bodies and long comment bodies both used to render as a
// single oversized row, pushing the sticky window past their own top.
// Chunking them into <=8-line (or per-paragraph) rows in the same
// scrollable/selectable list keeps every part of them reachable by
// scrolling sticky selection like everything else.
const CHUNK_MAX_LINES = 8;

type TreeRow =
  | { kind: 'text'; id: string; text: string; dim: boolean; bold: boolean }
  | { kind: 'comment'; id: string; row: CommentRow; bodyChunk: string; isFirstChunk: boolean; isLastChunk: boolean };

// Splits each comment's body into <=CHUNK_MAX_LINES display rows,
// keeping the tree-branch metadata (depth/prefix/etc.) attached to
// every chunk. Returns a parallel array mapping each display row back
// to its source index in commentRows, for anchor re-syncing.
function buildCommentDisplayRows(
  commentRows: CommentRow[],
  columns: number
): { rows: TreeRow[]; sourceIndices: number[] } {
  const rows: TreeRow[] = [];
  const sourceIndices: number[] = [];

  commentRows.forEach((row, commentIndex) => {
    if (row.content.type !== 'comment') {
      rows.push({ kind: 'comment', id: row.id, row, bodyChunk: '', isFirstChunk: true, isLastChunk: true });
      sourceIndices.push(commentIndex);
      return;
    }
    const prefixWidth = branchPrefix(row).length;
    const bodyWidth = Math.max(1, columns - prefixWidth);
    const bodyChunks = chunkText(row.content.body, bodyWidth, CHUNK_MAX_LINES);
    const safeChunks = bodyChunks.length > 0 ? bodyChunks : [''];
    safeChunks.forEach((bodyChunk, chunkIndex) => {
      rows.push({
        kind: 'comment',
        id: chunkIndex === 0 ? row.id : `${row.id}#${chunkIndex}`,
        row,
        bodyChunk,
        isFirstChunk: chunkIndex === 0,
        isLastChunk: chunkIndex === safeChunks.length - 1,
      });
      sourceIndices.push(commentIndex);
    });
  });

  return { rows, sourceIndices };
}

function estimateCommentDisplayHeight(displayRow: Extract<TreeRow, { kind: 'comment' }>, columns: number): number {
  const { row, bodyChunk, isFirstChunk, isLastChunk } = displayRow;
  if (row.content.type !== 'comment') return 1;
  const prefixWidth = branchPrefix(row).length;
  const bodyWidth = Math.max(1, columns - prefixWidth);
  const bodyLines = estimateWrappedLines(bodyChunk, bodyWidth);
  const headerLine = isFirstChunk ? 1 : 0;
  const margin = isLastChunk && row.depth === 0 ? 1 : 0;
  return headerLine + bodyLines + margin;
}

function estimateRowHeight(row: TreeRow, columns: number): number {
  return row.kind === 'text' ? estimateWrappedLines(row.text, columns) + 1 : estimateCommentDisplayHeight(row, columns);
}

export function CommentTree({ postBody, comments, onExpandMore, availableHeight }: CommentTreeProps): React.ReactElement {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const { columns } = useWindowSize();
  const commentRows = flattenVisibleComments(comments, expandedIds);
  const { rows: commentDisplayRows, sourceIndices } = buildCommentDisplayRows(commentRows, columns);

  const leadingRows: TreeRow[] = chunkText(postBody, columns, CHUNK_MAX_LINES).map((text, index) => ({
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
  const rows: TreeRow[] = [...leadingRows, ...commentDisplayRows];

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

  const liveRef = useRef({ commentRows, sourceIndices, selectedIndex, leadingCount });
  const anchorIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    liveRef.current = { commentRows, sourceIndices, selectedIndex, leadingCount };
  });

  useEffect(() => {
    const anchorId = anchorIdRef.current;
    if (anchorId === undefined) return;
    const {
      commentRows: currentCommentRows,
      sourceIndices: currentSourceIndices,
      selectedIndex: currentIndex,
      leadingCount: currentLeadingCount,
    } = liveRef.current;
    const matchedCommentIndex = currentCommentRows.findIndex((row) => row.id === anchorId);
    if (matchedCommentIndex === -1) return;
    const matchedDisplayIndex = currentSourceIndices.indexOf(matchedCommentIndex);
    if (matchedDisplayIndex === -1) return;
    const matchedIndex = currentLeadingCount + matchedDisplayIndex;
    if (matchedIndex !== currentIndex) {
      setSelectedIndex(matchedIndex);
    }
  }, [comments, expandedIds, setSelectedIndex]);

  useEffect(() => {
    const displaySelectedIndex = selectedIndex - leadingCount;
    const commentIndex = displaySelectedIndex >= 0 ? sourceIndices[displaySelectedIndex] : undefined;
    anchorIdRef.current = commentIndex === undefined ? undefined : nearestAnchorId(commentRows, commentIndex);
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
          <CommentRowView key={row.id} displayRow={row} selected={selected} />
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

function CommentRowView({
  displayRow,
  selected,
}: {
  displayRow: Extract<TreeRow, { kind: 'comment' }>;
  selected: boolean;
}): React.ReactElement {
  const { row, bodyChunk, isFirstChunk, isLastChunk } = displayRow;
  const prefix = branchPrefix(row);

  if (row.content.type === 'collapsedReplies') {
    return <RowText selected={selected}>{`${prefix}${row.content.replyCount} replies ▸`}</RowText>;
  }

  if (row.content.type === 'more') {
    return <RowText selected={selected}>{`${prefix}${row.content.count} more replies ▸`}</RowText>;
  }

  const bodyPrefix = continuationPrefix(row, row.content.continuesBelow);
  const authorColor = selected ? 'green' : usernameColor(row.content.author);
  const marginBottom = isLastChunk && row.depth === 0 ? 1 : 0;

  return (
    <Box flexDirection="column" marginBottom={marginBottom}>
      {isFirstChunk ? (
        <Box>
          <RowText selected={selected}>{prefix}</RowText>
          <Text color={authorColor} bold={selected}>
            {`u/${row.content.author}`}
          </Text>
          <RowText selected={selected}>{` (${row.content.score} pts)`}</RowText>
        </Box>
      ) : null}
      <RowText selected={selected}>
        {bodyPrefix}
        {bodyChunk}
      </RowText>
    </Box>
  );
}
