import type { CommentRow } from './flatten';

export function branchPrefix(row: Pick<CommentRow, 'isLastSibling' | 'ancestorContinues'>): string {
  return ancestorColumns(row.ancestorContinues) + (row.isLastSibling ? '└─ ' : '├─ ');
}

export function continuationPrefix(row: Pick<CommentRow, 'ancestorContinues'>, continuesBelow: boolean): string {
  return ancestorColumns(row.ancestorContinues) + (continuesBelow ? '│  ' : '   ');
}

function ancestorColumns(ancestorContinues: readonly boolean[]): string {
  return ancestorContinues.map((continues) => (continues ? '│  ' : '   ')).join('');
}
