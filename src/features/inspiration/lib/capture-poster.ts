/** Grabs a frame ~1s into a video file as a JPEG blob, for use as a poster/thumbnail. */
export function captureVideoPoster(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported."));
        return;
      }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src);
          if (blob) resolve(blob);
          else reject(new Error("Could not capture video frame."));
        },
        "image/jpeg",
        0.85
      );
    };

    video.onerror = () => reject(new Error("Could not load video."));
  });
}
