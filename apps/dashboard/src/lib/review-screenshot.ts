/** Capture helpers for Review chrome screenshots (outside the tunneled app HTML). */

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read image'));
    };
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

export async function readClipboardImage(): Promise<string | null> {
  if (!navigator.clipboard?.read) {
    throw new Error(
      'Clipboard image read is not supported in this browser — use Paste (⌘V) or Upload.',
    );
  }

  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (!type) continue;
    const blob = await item.getType(type);
    return fileToDataUrl(new File([blob], 'clipboard.png', { type: blob.type || 'image/png' }));
  }
  return null;
}

/**
 * Capture the current tab (or a chosen window) via the Screen Capture API.
 * Prefer this tab so the client gets the Review page + embedded preview.
 */
export async function captureTabScreenshot(): Promise<string> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen capture is not supported here — paste or upload a screenshot instead.');
  }

  const options: DisplayMediaStreamOptions & { preferCurrentTab?: boolean } = {
    audio: false,
    preferCurrentTab: true,
    video: {
      displaySurface: 'browser',
    },
  };

  const stream = await navigator.mediaDevices.getDisplayMedia(options);

  try {
    const track = stream.getVideoTracks()[0];
    if (!track) throw new Error('No video track from screen capture');

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        void video
          .play()
          .then(() => resolve())
          .catch(reject);
      };
      video.onerror = () => reject(new Error('Could not play capture stream'));
    });

    // One frame after play is enough for a still.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas');
    ctx.drawImage(video, 0, 0);

    const jpeg = canvas.toDataURL('image/jpeg', 0.82);
    return jpeg.startsWith('data:image') ? jpeg : canvas.toDataURL('image/png');
  } finally {
    for (const mediaTrack of stream.getTracks()) {
      mediaTrack.stop();
    }
  }
}
