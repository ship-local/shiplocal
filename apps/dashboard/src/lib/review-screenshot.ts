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

export async function bakePinIntoScreenshot(
  dataUrl: string,
  pin: { x: number; y: number },
): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0);
  const radius = Math.max(10, Math.round(Math.min(canvas.width, canvas.height) * 0.012));
  const px = pin.x * canvas.width;
  const py = pin.y * canvas.height;

  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.lineWidth = Math.max(2, Math.round(radius * 0.35));
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  const jpeg = canvas.toDataURL('image/jpeg', 0.82);
  return jpeg.startsWith('data:image') ? jpeg : canvas.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load screenshot for pin'));
    img.src = src;
  });
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
