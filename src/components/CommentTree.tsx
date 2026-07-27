import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { flattenVisibleComments, nearestAnchorId } from '../comments/flatten';
import { branchPrefix, continuationPrefix } from '../comments/render';
import { usernameColor } from '../colors';
import { useListNav } from '../hooks/useListNav';
import { RowText } from './RowText';
import { ImageTag } from './ImageTag';
import { useImageViewer } from '../hooks/useImageViewer';
import { useVisibleWindow } from '../hooks/useVisibleWindow';
import { estimateWrappedLines } from '../rendering/textMetrics';
import { chunkText } from '../rendering/postChunks';
import { formatRelativeTime } from '../rendering/relativeTime';
import type { CommentRow } from '../comments/flatten';
import type { RedditThing, BodySegment, ImageAttachment } from '../reddit/types';

export type CommentTreeProps = {
  postSegments: BodySegment[];
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
  | { kind: 'comment'; id: string; row: CommentRow; bodyChunk: string; isFirstChunk: boolean; isLastChunk: boolean }
  | {
      kind: 'image';
      id: string;
      attachment: ImageAttachment;
      row: CommentRow | null;
      isFirstChunk: boolean;
      isLastChunk: boolean;
    };

type Piece = { type: 'text'; text: string } | { type: 'image'; attachment: ImageAttachment };

// Splits a comment's body into ordered pieces: wrapped text chunks and
// inline images, each of which becomes its own selectable row.
function commentPieces(segments: BodySegment[], bodyWidth: number): Piece[] {
  const pieces: Piece[] = [];
  for (const segment of segments) {
    if (segment.kind === 'text') {
      for (const chunk of chunkText(segment.text, bodyWidth, CHUNK_MAX_LINES)) pieces.push({ type: 'text', text: chunk });
    } else {
      pieces.push({ type: 'image', attachment: segment.attachment });
    }
  }
  return pieces.length > 0 ? pieces : [{ type: 'text', text: '' }];
}

// Splits each comment into <=CHUNK_MAX_LINES text rows and per-image
// rows, keeping tree-branch metadata attached to every piece. Returns
// a parallel array mapping each display row to its source comment.
function buildCommentDisplayRows(commentRows: CommentRow[], columns: number): { rows: TreeRow[]; sourceIndices: number[] } {
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
    const pieces = commentPieces(row.content.bodySegments, bodyWidth);
    pieces.forEach((piece, pieceIndex) => {
      const isFirstChunk = pieceIndex === 0;
      const isLastChunk = pieceIndex === pieces.length - 1;
      const id = pieceIndex === 0 ? row.id : `${row.id}#${pieceIndex}`;
      if (piece.type === 'text') {
        rows.push({ kind: 'comment', id, row, bodyChunk: piece.text, isFirstChunk, isLastChunk });
      } else {
        rows.push({ kind: 'image', id: `${id}#img`, attachment: piece.attachment, row, isFirstChunk, isLastChunk });
      }
      sourceIndices.push(commentIndex);
    });
  });

  return { rows, sourceIndices };
}

// Post body rows: text paragraphs chunked, each image at its position.
function buildLeadingRows(postSegments: BodySegment[], columns: number): TreeRow[] {
  const rows: TreeRow[] = [];
  postSegments.forEach((segment, segmentIndex) => {
    if (segment.kind === 'text') {
      chunkText(segment.text, columns, CHUNK_MAX_LINES).forEach((text, chunkIndex) => {
        rows.push({ kind: 'text', id: `post:${segmentIndex}:${chunkIndex}`, text, dim: false, bold: false });
      });
    } else {
      rows.push({
        kind: 'image',
        id: `post-img:${segmentIndex}:${segment.attachment.id}`,
        attachment: segment.attachment,
        row: null,
        isFirstChunk: true,
        isLastChunk: true,
      });
    }
  });
  return rows;
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

function estimateImageHeight(displayRow: Extract<TreeRow, { kind: 'image' }>): number {
  const header = displayRow.row !== null && displayRow.isFirstChunk ? 1 : 0;
  return header + 2;
}

function estimateRowHeight(row: TreeRow, columns: number): number {
  if (row.kind === 'text') return estimateWrappedLines(row.text, columns) + 1;
  if (row.kind === 'comment') return estimateCommentDisplayHeight(row, columns);
  return estimateImageHeight(row);
}

export function CommentTree({ postSegments, comments, onExpandMore, availableHeight }: CommentTreeProps): React.ReactElement {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const { columns } = useWindowSize();
  const viewer = useImageViewer();
  const [nowSeconds] = useState(() => Date.now() / 1000);
  const commentRows = flattenVisibleComments(comments, expandedIds);
  const { rows: commentDisplayRows, sourceIndices } = buildCommentDisplayRows(commentRows, columns);

  const leadingRows: TreeRow[] = buildLeadingRows(postSegments, columns);
  leadingRows.push({ kind: 'text', id: 'comments-heading', text: 'Comments', dim: false, bold: true });
  if (commentRows.length === 0) {
    leadingRows.push({ kind: 'text', id: 'no-comments', text: 'No comments yet.', dim: true, bold: false });
  }
  const leadingCount = leadingRows.length;
  const rows: TreeRow[] = [...leadingRows, ...commentDisplayRows];

  const { selectedIndex, setSelectedIndex } = useListNav<TreeRow>({
    items: rows,
    onActivate: (item) => {
      if (item.kind === 'image') {
        viewer.openImage(item.attachment);
        return;
      }
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
        if (row.kind === 'text') {
          return <TextRowView key={row.id} text={row.text} dim={row.dim} bold={row.bold} selected={selected} />;
        }
        if (row.kind === 'comment') {
          return <CommentRowView key={row.id} displayRow={row} selected={selected} nowSeconds={nowSeconds} />;
        }
        return (
          <ImageRowView key={row.id} displayRow={row} selected={selected} available={viewer.available} nowSeconds={nowSeconds} />
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

function CommentHeader({
  row,
  selected,
  nowSeconds,
}: {
  row: CommentRow;
  selected: boolean;
  nowSeconds: number;
}): React.ReactElement | null {
  if (row.content.type !== 'comment') return null;
  const prefix = branchPrefix(row);
  const authorColor = selected ? 'green' : usernameColor(row.content.author);
  const age = formatRelativeTime(row.content.createdUtc, nowSeconds);
  return (
    <Box>
      <RowText selected={selected}>{prefix}</RowText>
      <Text color={authorColor} bold={selected}>
        {`u/${row.content.author}`}
      </Text>
      <RowText selected={selected}>{` · ${row.content.score} pts · ${age}`}</RowText>
    </Box>
  );
}

function CommentRowView({
  displayRow,
  selected,
  nowSeconds,
}: {
  displayRow: Extract<TreeRow, { kind: 'comment' }>;
  selected: boolean;
  nowSeconds: number;
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
  const marginBottom = isLastChunk && row.depth === 0 ? 1 : 0;

  return (
    <Box flexDirection="column" marginBottom={marginBottom}>
      {isFirstChunk ? <CommentHeader row={row} selected={selected} nowSeconds={nowSeconds} /> : null}
      <RowText selected={selected}>
        {bodyPrefix}
        {bodyChunk}
      </RowText>
    </Box>
  );
}

function ImageRowView({
  displayRow,
  selected,
  available,
  nowSeconds,
}: {
  displayRow: Extract<TreeRow, { kind: 'image' }>;
  selected: boolean;
  available: boolean;
  nowSeconds: number;
}): React.ReactElement {
  const { attachment, row, isFirstChunk, isLastChunk } = displayRow;
  const isComment = row !== null;
  const marginBottom = isComment && isLastChunk && row.depth === 0 ? 1 : 0;
  const continuesBelow = row !== null && row.content.type === 'comment' ? row.content.continuesBelow : false;

  return (
    <Box flexDirection="column" marginBottom={marginBottom}>
      {isComment && isFirstChunk ? <CommentHeader row={row} selected={selected} nowSeconds={nowSeconds} /> : null}
      {isComment ? (
        <Box>
          <RowText selected={selected}>{continuationPrefix(row, continuesBelow)}</RowText>
          <ImageTag attachment={attachment} selected={selected} available={available} />
        </Box>
      ) : (
        <Box marginBottom={1}>
          <ImageTag attachment={attachment} selected={selected} available={available} />
        </Box>
      )}
    </Box>
  );
}
