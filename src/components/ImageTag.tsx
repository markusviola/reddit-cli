import React from 'react';
import { Text } from 'ink';
import type { ImageAttachment } from '../reddit/types';

/** Teal accent shared with the footer chrome. */
export const IMAGE_TAG_COLOR = '#00FFC8';

function tagText(attachment: ImageAttachment): string {
  return attachment.images.length > 1 ? `gallery 🖼️  x${attachment.images.length}` : 'image 📷';
}

export type ImageTagProps = {
  attachment: ImageAttachment;
  selected: boolean;
  available: boolean;
};

// A plain highlightable trigger row: teal text in brackets normally;
// when selected, the whole tag (brackets included) gets a solid teal
// background — the brackets go teal-on-teal (invisible) rather than
// disappearing, so the tag keeps its width and doesn't shift. When
// chafa is missing it stays inert and, while selected, explains why
// nothing opens.
export function ImageTag({ attachment, selected, available }: ImageTagProps): React.ReactElement {
  if (!available) {
    const label = `[${tagText(attachment)}]`;
    return <Text dimColor>{selected ? `${label} — chafa not found` : label}</Text>;
  }
  if (selected) {
    return (
      <Text backgroundColor={IMAGE_TAG_COLOR}>
        <Text color={IMAGE_TAG_COLOR}>[</Text>
        <Text color="black">{tagText(attachment)}</Text>
        <Text color={IMAGE_TAG_COLOR}>]</Text>
      </Text>
    );
  }
  return <Text color={IMAGE_TAG_COLOR}>{`[${tagText(attachment)}]`}</Text>;
}
