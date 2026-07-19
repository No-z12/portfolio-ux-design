# Performance media derivatives

This folder contains generated media derivatives used by the project pages. Original GIF/MP4 sources remain in place as archival fallbacks; the runtime markup points to these optimized derivatives.

## Encoding parameters

Opaque GIF animations were converted with FFmpeg 7.1:

```text
ffmpeg -i INPUT.gif \
  -vf "scale=WIDTH:-2:flags=lanczos" \
  -an -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -movflags +faststart -fps_mode vfr -map_metadata -1 OUTPUT.mp4
```

The two existing MP4 files were not re-encoded. Their video streams were copied with FFmpeg stream copy while audio and metadata were removed and the MP4 index was moved to the front:

```text
ffmpeg -i INPUT.mp4 -map 0:v:0 -c copy -an \
  -movflags +faststart -map_metadata -1 OUTPUT-silent.mp4
```

The two transparent animations use lossless animated WebP. FFmpeg's animated-WebP path did not preserve the source GIF's long hold durations, so the final files were generated frame-by-frame with Pillow 12.3.0:

```text
format=WEBP, save_all=True, duration=<source duration list>, loop=0,
lossless=True, quality=100, method=6, exact=True, minimize_size=True
```

## Source mapping and size reduction

Sizes are binary KiB. The shared workbench source is byte-identical in project 1 and project 4, so it has one shared derivative.

| Source | Output | Before | After | Reduction |
|---|---|---:|---:|---:|
| `assets/project1/p11-demo.gif` and `assets/project4/p14-mobile-workbench.gif` | `workbench-p1-p11-p4-p14-96w.mp4` | 5550.4 each | 55.0 | 99.0% |
| `portfolio-assets/project3/media/p03-visual-orb.gif` | `project3-p03-visual-orb-96w.mp4` | 2728.7 | 11.7 | 99.6% |
| `assets/project4/p34-ai-helper.gif` | `project4-p34-ai-helper-128w.mp4` | 21993.4 | 67.6 | 99.7% |
| `assets/project4/p33-dropdown-search.gif` | `project4-p33-dropdown-search-320w.mp4` | 145.9 | 21.0 | 85.6% |
| `assets/project4/p33-button-dialog.gif` | `project4-p33-button-dialog-320w.mp4` | 157.0 | 19.7 | 87.4% |
| `assets/project4/p33-dropdown.gif` | `project4-p33-dropdown-320w.mp4` | 93.2 | 12.7 | 86.3% |
| `assets/project4/p11-mobile-layout.gif` | `project4-p11-mobile-layout-256w.webp` | 159.5 | 28.1 | 82.4% |
| `assets/project4/p11-web-layout.gif` | `project4-p11-web-layout-256w.webp` | 202.0 | 39.1 | 80.6% |
| `assets/project1/p18-demo.mp4` | `project1-p18-demo-silent.mp4` | 3926.2 | 3004.9 | 23.5% |
| `portfolio-assets/project3/media/visual-audit-assistant-demo.mp4` | `project3-visual-audit-assistant-demo-silent.mp4` | 3554.6 | 2856.5 | 19.6% |

For the two GIFs that already had responsive runtime candidates, the relevant comparison is also:

- `optimized-gif/workbench-96w.gif`: 1132.2 KiB to 55.0 KiB, a 95.1% reduction.
- `optimized-gif/p34-ai-helper-192w.gif`: 2586.0 KiB to 67.6 KiB, a 97.4% reduction.

## Timing, dimensions, and validation

| Output | Dimensions | Frames | Duration | Alpha / audio | SSIM vs resized source |
|---|---:|---:|---:|---|---:|
| `workbench-p1-p11-p4-p14-96w.mp4` | 96x92 | 177 | 5.61s | no audio | 0.985799 |
| `project3-p03-visual-orb-96w.mp4` | 96x98 | 74 | 2.96s | no audio | 0.988863 |
| `project4-p34-ai-helper-128w.mp4` | 128x156 | 120 | 4.80s | no audio | 0.989520 |
| `project4-p33-dropdown-search-320w.mp4` | 320x232 | 203 | 8.12s | no audio | 0.997819 |
| `project4-p33-button-dialog-320w.mp4` | 320x246 | 184 | 7.36s | no audio | 0.997926 |
| `project4-p33-dropdown-320w.mp4` | 320x246 | 131 | 5.24s | no audio | 0.998120 |
| `project4-p11-mobile-layout-256w.webp` | 256x152 | 116 | 12.63s | lossless alpha, loop=0 | 1.0 / exact RGBA |
| `project4-p11-web-layout-256w.webp` | 256x152 | 115 | 14.38s | lossless alpha, loop=0 | 1.0 / exact RGBA |
| `project1-p18-demo-silent.mp4` | 1238x720 | 1297 | 57.38s video track | no audio | stream copy |
| `project3-visual-audit-assistant-demo-silent.mp4` | 1280x682 | 978 | 43.30s video track | no audio | stream copy |

Validation results:

- Every H.264 animation retains the source GIF's frame count and total duration exactly.
- Both animated WebP files retain frame count, per-frame duration list, total loop duration, and transparent pixels exactly; the decoded RGBA mismatch count is zero.
- Every MP4 contains one H.264 video stream and no audio stream.
- MP4 files use `faststart` for progressive HTTP playback.
