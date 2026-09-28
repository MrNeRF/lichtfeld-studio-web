---
title: "Projects and the LichtFeld Gallery"
description: "A first look at two of the biggest additions in LichtFeld Studio 0.5.4: the .licht project file with a new project manager, and the LichtFeld Gallery for publishing and sharing splats in the browser."
summary: "LichtFeld Studio 0.5.4 is around the corner. A full walkthrough of the new project manager and the LichtFeld Gallery: one file for the whole project, publishing from Studio, share links, stories, highlights and collections."
date: 2026-09-28
author: LichtFeld Studio
category: Preview
tags:
  - youtube
  - gallery
  - project-manager
  - gaussian-splatting
  - open-source
image: /static/blog/lichtfeld-studio-0-5-4-projects-and-gallery.jpg
imageAlt: LichtFeld Studio 0.5.4 feature preview, Projects and Gallery, with the XMAS scene splat
showHeroImage: false
---

LichtFeld Studio 0.5.4 is around the corner, so today we are showing two of its biggest additions. We recorded a full walkthrough of the new project manager and the LichtFeld Gallery. You can [watch it on YouTube](https://youtu.be/3TsppHhdZK8), or keep reading for the short version.

<iframe
  src="https://www.youtube-nocookie.com/embed/3TsppHhdZK8"
  title="LichtFeld Studio 0.5.4 – Projects and Gallery"
  style="width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 12px;"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin"
  allowfullscreen
></iframe>

## One file for the whole project

Project files were one of the most requested features in last summer's survey. We had an earlier JSON version, but it held too little state, so we removed it for a while. The new `.licht` format replaces it.

A `.licht` project can hold the dataset information, finished splat models, a resumable training state, saved generations, your panel layout and working state, and the sequencer data with a thumbnail. Datasets can stay linked, or you can embed them in the project file when you need to hand it to someone else. Close LichtFeld, open the project again later, and you are back where you left off.

## A project manager instead of an asset list

The old asset manager has become a project manager. All your projects sit in one library, shown as a grid or a list, and opening one is a single click. You can create a new project from a dataset folder or a splat file, or start with an empty one.

## From Studio to the browser

The LichtFeld Gallery is the other half of the story. Connect LichtFeld Studio to the [portal](https://portal.lichtfeld.io), publish a project, and open it in the browser. The cover, starting position, field of view, background colour and sequencer motion all come across from Studio, so you do not have to rebuild the view online. Every gallery includes 300 MB of storage.

Projects stay private until you create a link. You can choose whether a link expires, and the shared view hides the management controls. If you no longer need a link, revoke it and it stops working.

## Stories, highlights and collections

Once a scene is online, you can turn it into a small presentation:

- **Stories** save viewpoints with a thumbnail, a name and a duration, and play them in sequence as a guided tour.
- **Highlights** place a marker in the scene with a title and a description.
- **Collections** put several projects on one page with a cover and an order you choose, shared with a single link.

These are managed online for now and are not yet synchronised with the local project.
