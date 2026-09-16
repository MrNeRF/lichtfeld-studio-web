---
title: "Session 3: 174 Commits Later, We Have a Studio"
description: "Kristof is back from vacation and Janusch shows him the new LichtFeld Gallery, the .licht project manager, 3DGUT in the browser, exposure correction, and what is coming in 0.6."
summary: "In Session 3, Kristof returns to 174 commits, discovers the new project manager and LichtFeld Gallery, and gets a look at 3DGUT in the browser, share links, exposure correction, and the road to 0.6."
date: 2026-09-16
author: LichtFeld Studio
category: Sessions
tags:
  - session
  - youtube
  - gallery
  - project-manager
  - 3dgut
  - gaussian-splatting
  - open-source
  - community
image: /static/blog/lichtfeld-studio-session-3.jpg
imageAlt: Janusch and Kristof in LichtFeld Studio Session 3, with the Kiosque des Noctambules splat beside them
showHeroImage: false
featured: true
---

The third **LichtFeld Studio Session** is out. Kristof is back from two weeks in the south of France, and he returns to a slightly ridiculous number of pull requests: **174 commits waiting for him**.

Janusch uses the session to catch him up. We talk about the new preferences tab, the split between the stable and development branches, and the biggest change of all: the LichtFeld Gallery. You can [watch Session 3 on YouTube](https://youtu.be/1zI6oQepLyw), or keep reading for the short version.

<iframe
  src="https://www.youtube-nocookie.com/embed/1zI6oQepLyw"
  title="LichtFeld Studio Session 3"
  style="width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 12px;"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin"
  allowfullscreen
></iframe>

## A small camera rig for 4D Gaussian splatting

We have applied for an Epic MegaGrant to bring 4D Gaussian splatting into LichtFeld Studio. The idea is to make a useful setup with eight to ten genlocked iPhones instead of a huge light stage with a wall of cameras. That would still be a serious investment, but it would be within reach for smaller studios.

The project is aimed at the kind of moving scenes that are difficult to handle today. The application includes a hardware budget and room for another person to help with the work. We expect to hear the decision in mid-December. If it goes ahead, the work would run through the first half of 2027.

## Preferences that remember how you work

Francesco has been working on a proper preferences tab. You can choose the language, set the default project folder, pick a light, dark, or automatic theme, and decide where the toolbar lives. It can sit at the top, bottom, or side, and LichtFeld remembers the choice.

There are also controls for navigation and zoom speed, key bindings, and the MCP server. If you use a tool that can talk to LichtFeld through MCP, you can set the endpoint here or make it available on your local network. You can also turn the server off when you do not need it.

The changes sound small, but this is the kind of work that makes an application feel like your own. Kristof had only been away for two weeks and still found options he did not know existed.

## Faster viewing on slower machines

Spatial scaling is now available for people who need a few more frames per second while working. LichtFeld renders at a lower resolution and upscales the result. You can choose a balanced mode or a faster performance mode.

There is also a DLSS option on the development branch. It is useful, but the NVIDIA licence needs to be handled carefully because it does not fit directly with the GPL-3.0 licence. For now, DLSS stays optional while we work out the right way to distribute it.

## Master is settling down, dev is moving ahead

The master branch is being kept deliberately quiet while we prepare version **0.5.4**. There have been many changes under the hood, including faster exports, quicker startup, and a more responsive interface. A feature freeze gives those changes a chance to settle before the next release.

The dev branch is where the next group of features is being built for **0.6**. At the time of the recording it was already 66 commits ahead. It includes SAM2 running natively inside LichtFeld, without needing a separate PyTorch installation. The plan is to use that for masking and to bring more structure-from-motion work into the application.

## The LichtFeld Gallery

The main story of this session is the [LichtFeld Gallery](https://portal.lichtfeld.io). LichtFeld has always been a local application. When you finished a splat, you had to send someone a file, make a video, or upload it to another service.

The gallery gives every portal member a small amount of free space. There will be larger plans for people who need more storage or business features, but the basic idea is simple: upload a splat and share it without giving away ownership of your work. The gallery terms say that what you upload stays yours.

The gallery is still being polished, but the workflow is already clear. Connect LichtFeld to the portal, choose a project, upload it, and open it in the browser. You can share a public link or make a private link with an expiry date. If you change your mind, revoke the link and it stops working.

## The asset manager becomes a project manager

The old asset manager mostly kept track of files that LichtFeld could open. The new project manager is built around the `.licht` project format.

A `.licht` project can contain the training data, checkpoints, application state, thumbnails, save points, and licence information. If you select part of a scene, save, close the application, and come back later, the project can reopen in the state where you left it. Earlier save points remain available too.

Projects can be shown in a grid or a list. You can update a thumbnail from a training image or your current viewport, embed the source data when you need to share it, and add a custom licence. A project that exists only in the gallery can be downloaded as a new local project.

The manager also compares the local project with the gallery version using hashes. If the two versions differ, LichtFeld tells you. You can upload the local changes, keep the gallery version, or pull the remote copy back down.

Some of this is still work in progress. That is exactly why we want people to try it and tell us what feels useful and what needs to change.

## 3DGUT in the browser

Open a published splat in the gallery and you can add waypoints, save specific camera views, and move from one view to the next. You can also preview the scene as another person will see it.

The browser viewer now supports **3DGUT**. It is a different way of creating splats, and many viewers do not display those scenes correctly. In the session, Janusch opens a wheel scene and switches the 3DGUT mode on in the gallery. The spokes become visible again.

This is a useful step for people who want to send a scene to someone else. The recipient does not need LichtFeld installed just to look around.

## One path from images to a shared scene

The goal for 0.6 is an end-to-end workflow. Add images or a video, run the reconstruction, clean up the result, and publish it straight away. The desktop application and the gallery should stay in sync while you work.

That means the gallery is more than a place to store finished files. It is becoming an extension of the application on the web. You can train locally, upload a version, update it after editing, and keep several versions for a client or a project.

## Better exposure for single-camera captures

Another feature in the session is exposure correction. It combines PP-ISP with a bilateral grid and is aimed at captures made with one camera and automatic exposure. The correction tries to bring the images onto a consistent global exposure before training.

Duckbill Studio tested it on a reconstruction and found that the walls came out much cleaner. It is still a setting for people who like to tune their own pipeline, though. Janusch would rather not turn the trainer into a wall of mysterious checkboxes, so the longer-term plan is to add presets for common situations such as indoor and aerial captures.

Power users can keep the detailed controls. Everyone else should be able to say what kind of capture they have and get a sensible starting point.

## A cleaner nightly build

One user compared version 0.5.3 with a recent nightly build. The newer result was cleaner by default, with more natural colour and a sharper background. Areas that needed manual cleanup before came out clean straight from the reconstruction.

These improvements take a lot of testing. A change that helps one camera rig can hurt another, so we keep running scenes, trying different parameters, and checking the results by eye. The progress is not always dramatic from one week to the next, but it is moving in the right direction.

## A splat that tunes in

The session ends with a beautiful example from Jérôme at [360images.fr](https://360images.fr). His scene of **le Kiosque des Noctambules** begins as a point cloud. As you move closer, the full splat tunes in and you can look around. Step back out and it becomes a point cloud again.

That kind of presentation is what we want to make easier. A splat is not only a file to inspect. It can be a small, carefully made experience that you share with another person.

## What comes next

The gallery is planned for version 0.5.4 as a beta. That gives people a chance to use it, report bugs, and help shape the bigger 0.6 release.

Kristof summed up the change better than we could: **we had a trainer, now we have a studio**.

LichtFeld Studio is open source under the GPL-3.0 licence. You can find the code on [GitHub](https://github.com/MrNeRF/LichtFeld-Studio), try the gallery through the [LichtFeld Portal](https://portal.lichtfeld.io), and share your own scenes with us.

Thank you to everyone who keeps testing LichtFeld, reporting bugs, sharing scenes, and contributing code. See you in the next session.
