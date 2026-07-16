import React from 'react';
import { Text } from 'ink';

export const IMAGE_TAG_COLOR = '#00FFC8';

export function ImageTag(): React.ReactElement {
  return <Text color={IMAGE_TAG_COLOR}>{'[image 📷]'}</Text>;
}
