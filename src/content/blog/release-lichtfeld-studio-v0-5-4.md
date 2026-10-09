---
title: "Release: LichtFeld Studio v0.5.4 is out!"
description: LichtFeld Studio v0.5.4 ships with 1,222 commits from 26 contributors, bringing projects and a project manager, an online gallery, faster training, lower VRAM usage, and normal-guided training.
summary: v0.5.4 brings the native .licht project format with a project manager, the online gallery in beta, up to 3x faster training than v0.5.3, lower VRAM usage, and normal-guided training.
date: 2026-10-09
author: LichtFeld Studio
category: Release Notes
tags:
  - release
  - project-manager
  - gallery
  - training
  - vram
image: /static/blog/lichtfeld-studio-v0-5-4-release.jpg
imageAlt: LichtFeld Studio 0.5.4 release video thumbnail showing the project manager
showHeroImage: false
---

With 1,222 commits from 26 contributors merged into master, v0.5.4 brings projects, an online gallery, faster training and lower VRAM usage.

<iframe
  src="https://www.youtube-nocookie.com/embed/DIcGFMeBSXU"
  title="LichtFeld Studio 0.5.4 release overview"
  style="width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 12px;"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin"
  allowfullscreen
></iframe>

## What's new in v0.5.4

- **Projects and Project Manager:** The native `.licht` project format we promised for the next release is here. A project keeps datasets, checkpoints, trained models, scene edits, camera paths and workspace layouts together, so you can reopen it to continue training, refine a scene or export your work. The new Project Manager lets you browse, search, filter, preview and organise local and external projects, with autosave, save points and recovery after interrupted sessions.

- **Online Gallery (beta for all portal users):** Publish projects directly from LichtFeld Studio to the online gallery with title, description, thumbnail, camera view and presentation settings. Keep working locally, republish updates to the same scene and sync gallery-side changes back. Large scenes stream as SSOG. The gallery is in beta testing for all portal users, so we would love your feedback.

- **Faster training and lower VRAM:** Up to 3x faster training than v0.5.3, lower VRAM usage in training and the viewer, better control of peak memory, faster loading of large PLY files and splat models, and more memory-efficient compaction and export for very large scenes.

- **Normal-guided training:** Normal priors, generated automatically when missing, add geometric guidance alongside colour and help with ambiguous structure, challenging surfaces and thin structures. Depth and normal supervision now also work with GUT and fisheye cameras.

- **Training improvements:** MRNF gains far-field reconstruction and better opacity handling, pruning, initialisation and resume. GUT improves quality, exposure correction and undistortion. Better appearance correction and sky handling, transparent images composited against the training background, improved EXR support and more camera models for fisheye lenses and complex distortion.

- **A smoother studio:** Heavy operations block the interface less, the viewport redraws less and paces frames better when idle, plus clearer selection feedback, better brushes, crop boxes, depth filters, scene tree and undo/redo, and better Unicode paths, Windows file handling and Wayland support.

- **Presentation and export:** A richer HTML viewer with labels, multiple measurements, screenshots and VR-oriented interaction; expanded and faster PLY, SOG, SSOG, SPZ, USD, glTF and GLB support; better video extraction, camera paths and headless rendering.

## Availability

This release is available to all supporters as a Windows binary via [portal.lichtfeld.io](http://portal.lichtfeld.io/).

At the same time, LichtFeld Studio remains free and open source under GPLv3 and can also be built directly from source.

Please consider supporting the ongoing development of LichtFeld Studio through a donation via the portal or the supporters page.

## Thank you

Thank you to everyone who supports this project financially, contributes code, reports bugs, provides datasets, helps with the website, and contributes in countless other ways.

A special thank you to our foundational sponsor [Core11](https://www.core11.eu/), our Gold Sponsor [Volinga](https://web.volinga.ai/), and our new hardware sponsor [Tersus GNSS](https://www.tersus-gnss.com/). Thank you as well to every donor and to all of our Bronze Sponsors.

## Looking ahead to v0.5.5

The next iteration toward v0.5.5 focuses on integrating structure from motion, so you can go from a video or a set of images straight to a trained and published scene, all inside LichtFeld Studio.

> Hint: We do not yet have a Silver Sponsor or Platinum Sponsor.
