---
title: "Release: LichtFeld Studio v0.5.3 is out!"
description: LichtFeld Studio v0.5.3 ships with 316 commits, a Vulkan viewer migration, RAD and LOD workflows, Asset Manager upgrades, viewport export, training improvements, and more.
summary: v0.5.3 is a major LichtFeld Studio release with 316 commits merged into master, led by Vulkan rendering, RAD/LOD workflows, Asset Manager upgrades, and viewport export.
date: 2026-07-01
author: LichtFeld Studio
category: Release Notes
tags:
  - release
  - vulkan
  - rad
  - lod
  - asset-manager
  - viewport-export
image: /static/blog/lichtfeld-studio-v0-5-3-release.png
imageAlt: LichtFeld Studio v0.5.3 release preview showing release highlights and sponsor names
featured: true
---

With 316 commits merged into master, this release is a huge step forward for LichtFeld Studio.

## What's new in v0.5.3

- **Vulkan viewer/rendering migration:** New Vulkan viewport pipeline, pass graph, VkSplat renderer, Vulkan point-cloud renderer, 3DGUT/VkSplat support, improved alpha/depth composition, tighter CUDA/Vulkan interoperability, and device matching on multi-GPU systems.

- **RAD + LOD workflow:** Added RAD file export/import, RAD LOD viewer, Spark-style GPU LOD selection, GPU-driven page prefetching, a bounded VRAM pool, out-of-core PLY-to-RAD LOD conversion, and RAD import/export speedups of approximately 3-5x.

- **HiGS / macro-tile inference:** Added a macro-tile inference path for the Vulkan viewer, including macro sorting, batched rasterization, composition, and capacity management.

- **Asset Manager:** Added and significantly enhanced the Asset Manager with thumbnails, SH information, faster synchronization, import-from-URL support, docked mode, data-loading popup integration, and general UI cleanup.

- **Viewport export:** Integrated viewport export directly into the application as a toolbar/overlay tool, added fast `render_view_u8`-style readback paths, fixed high-resolution clipping issues, improved orthographic export parity, resolved 32K image/video export problems, and added post-export GPU resource cleanup.

- **Selection and tooling:** Added and reworked selection toolbar controls, the Select menu, ring selection, color eyedropper, distance-from-center selection, faster point-cloud and zoomed-out selection paths, Vulkan measurement tool fixes, and drag-and-drop scene graph improvements.

- **UI/RmlUi platform work:** Major RmlUi redesign efforts, hot reloading for RML/RCSS/Python UI files, reactive UI/store integration, viewport toolbar flyouts, improved histogram interactions, input settings enhancements, custom TRS gizmos, and numerous panel, tooltip, and localization fixes.

- **Windowing and UX:** Added borderless window support, title bar drag/maximize/restore behavior, work-area-aware maximize functionality, resize responsiveness and performance improvements, and DPI/UI scaling fixes.

- **Training and data features:** Added adaptive depth loss and depth gradients for the EWA rasterizer, mask loading/application fixes, a new combined Ignore+Segment mask mode, `--add-splat`, `--freeze`, improved checkpoint and training state handling, and training speed and VRAM optimizations.

- **COLMAP/equirectangular support:** Added SPHERICAL/equirectangular camera model support and canonical EQUIRECTANGULAR handling, along with fixes for undistortion and camera export.

## Availability

This release is rolling out to all supporters as a Windows binary via [portal.lichtfeld.io](http://portal.lichtfeld.io/).

At the same time, LichtFeld Studio remains committed to being free and open source under GPLv3 and can also be built directly from source.

Please consider supporting the ongoing development of LichtFeld Studio through a donation via the portal or the supporters page.

## Thank you

Thank you to everyone who supports this project financially, contributes code, reports bugs, provides datasets, helps with the website, and contributes in countless other ways.

A special thank you to our foundational sponsor [Core11](https://www.core11.eu/) and our Gold Sponsor [Volinga](https://web.volinga.ai/), whose support has helped make the current state of the software possible. Thank you as well to every donor and to all of our new Bronze Sponsors.

## Looking ahead to v0.6

For the next major release, work will focus primarily on stability and user experience. This includes improved cleanup workflows and the ability to modify training parameters while training is in progress.

I would also like to introduce a native `.licht` project format that allows users to save and restore their complete editor state. And whatever comes up and gets contributed.

> Hint: We do not yet have a Silver Sponsor or Platinum Sponsor.
