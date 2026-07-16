import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { flattenVisibleComments, nearestAnchorId } from '../comments/flatten';
import { branchPrefix, continuationPrefix } from '../comments/render';
import { usernameColor } from '../colors';
import { useListNav } from '../hooks/useListNav';
import { RowText } from './RowText';
import { useVisibleWindow } from '../hooks/useVisibleWindow';
import { estimateWrappedLines } from '../rendering/textMetrics';
import type { CommentRow } from '../comments/flatten';
import type { RedditThing } from '../reddit/types';

export type CommentTreeProps = {
  comments: RedditThing[];
  onExpandMore: (row: CommentRow) => void;
  availableHeight: number;
};

function estimateRowHeight(row: CommentRow, columns: number): number {
  if (row.content.type === 'collapsedReplies' || row.content.type === 'more') {
    return 1;
  }
  const prefixWidth = branchPrefix(row).length;
  const bodyWidth = Math.max(1, columns - prefixWidth);
  const bodyLines = estimateWrappedLines(row.content.body, bodyWidth);
  const margin = row.depth === 0 ? 1 : 0;
  return 1 + bodyLines + margin;
}

export function CommentTree({ comments, onExpandMore, availableHeight }: CommentTreeProps): React.ReactElement {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const rows = flattenVisibleComments(comments, expandedIds);
  const { columns } = useWindowSize();

  const { selectedIndex, setSelectedIndex } = useListNav<CommentRow>({
    items: rows,
    onActivate: (row) => {
      if (row.content.type === 'collapsedReplies') {
        const sourceId = row.id.slice('collapsed:'.length);
        setExpandedIds((previous) => new Set([...previous, sourceId]));
      } else if (row.content.type === 'more') {
        onExpandMore(row);
      }
    },
  });

  const liveRef = useRef({ rows, selectedIndex });
  const anchorIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    liveRef.current = { rows, selectedIndex };
  });

  useEffect(() => {
    const anchorId = anchorIdRef.current;
    if (anchorId === undefined) return;
    const { rows: currentRows, selectedIndex: currentIndex } = liveRef.current;
    const matchedIndex = currentRows.findIndex((row) => row.id === anchorId);
    if (matchedIndex !== -1 && matchedIndex !== currentIndex) {
      setSelectedIndex(matchedIndex);
    }
  }, [comments, expandedIds, setSelectedIndex]);

  useEffect(() => {
    anchorIdRef.current = nearestAnchorId(rows, selectedIndex);
  });

  const itemHeights = rows.map((row) => estimateRowHeight(row, columns));
  const { start, end, hasAbove, hasBelow } = useVisibleWindow(rows.length, selectedIndex, itemHeights, availableHeight);

  if (rows.length === 0) {
    return <Text>No comments yet.</Text>;
  }

  return (
    <Box flexDirection="column">
      {hasAbove ? <Text dimColor>{`↑ ${start} more above`}</Text> : null}
      {rows.slice(start, end).map((row, offset) => {
        const index = start + offset;
        return <CommentRowView key={row.id} row={row} selected={index === selectedIndex} />;
      })}
      {hasBelow ? <Text dimColor>{`↓ ${rows.length - end} more below`}</Text> : null}
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
