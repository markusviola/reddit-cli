import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from 'ink';
import { detectChafa, isChafaKnownAvailable } from '../images/chafa';
import { detectImageProtocol } from '../images/protocol';
import { runStandaloneImageViewer } from '../images/standaloneViewer';
import type { ImageProtocol } from '../images/protocol';
import type { ImageAttachment } from '../reddit/types';

/** Terminal graphics protocol, detected once from the environment. */
export const IMAGE_PROTOCOL: ImageProtocol = detectImageProtocol(process.env);

export type ImageViewer = {
  available: boolean;
  protocol: ImageProtocol;
  openImage: (attachment: ImageAttachment) => void;
};

// Tracks chafa detection asynchronously so image tags render inert
// until (and unless) chafa is confirmed present.
export function useChafaAvailable(): boolean {
  const [available, setAvailable] = useState(isChafaKnownAvailable());
  useEffect(() => {
    let mounted = true;
    void detectChafa().then((value) => {
      if (mounted) setAvailable(value);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return available;
}

// Opens an image full-screen by suspending Ink and handing the terminal
// to the raw-stdin viewer, so graphics escape sequences bypass Ink's
// text wrapping. A busy guard blocks re-entry while one is already open.
export function useImageViewer(): ImageViewer {
  const { suspendTerminal } = useApp();
  const available = useChafaAvailable();
  const busyRef = useRef(false);

  const openImage = useCallback(
    (attachment: ImageAttachment): void => {
      if (!available || busyRef.current || attachment.images.length === 0) return;
      busyRef.current = true;
      void suspendTerminal(async () => {
        await runStandaloneImageViewer(attachment, IMAGE_PROTOCOL);
      }).finally(() => {
        busyRef.current = false;
      });
    },
    [available, suspendTerminal]
  );

  return { available, protocol: IMAGE_PROTOCOL, openImage };
}
