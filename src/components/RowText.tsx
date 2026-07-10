import React from 'react';
import { Text } from 'ink';

export type RowTextProps = {
  selected: boolean;
  dim?: boolean;
  children: React.ReactNode;
};

export function RowText({ selected, dim = false, children }: RowTextProps): React.ReactElement {
  if (selected) {
    return (
      <Text color="green" bold>
        {children}
      </Text>
    );
  }
  return dim ? <Text dimColor>{children}</Text> : <Text>{children}</Text>;
}
