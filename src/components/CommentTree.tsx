import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { flattenVisibleComments } from '../comments/flatten';
import { branchPrefix, continuationPrefix } from '../comments/render';
import { usernameColor } from '../colors';
import { useListNav } from '../hooks/useListNav';
import type { CommentRow } from '../comments/flatten';
import type { RedditThing } from '../reddit/types';

export type CommentTreeProps = {
  comments: RedditThing[];
  onExpandMore: (row: CommentRow) => void;
};

export function CommentTree({ comments, onExpandMore }: CommentTreeProps): React.ReactElement {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const rows = flattenVisibleComments(comments, expandedIds);

  const { selectedIndex } = useListNav<CommentRow>({
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

  if (rows.length === 0) {
    return <Text>No comments yet.</Text>;
  }

  return (
    <Box flexDirection="column">
      {rows.map((row, index) => (
        <CommentRowView key={row.id} row={row} selected={index === selectedIndex} />
      ))}
    </Box>
  );
}

function RowText({ selected, children }: { selected: boolean; children: React.ReactNode }): React.ReactElement {
  return selected ? (
    <Text color="green" bold>
      {children}
    </Text>
  ) : (
    <Text>{children}</Text>
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
        <RowText selected={selected}>{` (${row.content.score})`}</RowText>
      </Box>
      <RowText selected={selected}>
        {bodyPrefix}
        {row.content.body}
      </RowText>
    </Box>
  );
}
