---
title: "Session 1: Faster Training, a LiDAR for the Lab, and What You Asked For"
description: The first LichtFeld Studio Session is on YouTube. Janusch and Kristof talk about a surprising 3x training speed-up, the survey results, a donated LiDAR scanner, community contributions, and the new .licht project format.
summary: Our first Session is live on YouTube. In about 37 minutes we cover a 3x training speed-up, your survey answers, a LiDAR scanner for the lab, and the new .licht project format.
date: 2026-08-28
author: LichtFeld Studio
category: Sessions
tags:
  - session
  - youtube
  - training
  - lidar
  - licht-format
  - community
image: /static/blog/lichtfeld-studio-session-1.jpg
imageAlt: Janusch and Kristof in the first LichtFeld Studio Session
showHeroImage: false
featured: true
---

<iframe
  src="https://www.youtube-nocookie.com/embed/uoSI_4RlvaY"
  title="LichtFeld Studio Session 1"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin"
  allowfullscreen
></iframe>

We just published something new: the first **LichtFeld Studio Session**. It is a video series where Janusch and Kristof sit down and talk about what is happening in the project — what got built, what the community is working on, and what comes next.

This first one is pre-recorded (and yes, we were a bit nervous — you can hear it in the first minute). From the next session on, we want to stream live so you can ask questions while we talk. Here is what we covered.

## Kristof is now part of the team

Thanks to the funding from [Core11](https://www.core11.eu/) and the portal members, Kristof now works part-time on LichtFeld Studio. He made his first contribution less than a year ago — it started with documentation, then small fixes, and grew from there. Today he looks at the software the way a user does: a feature is not done when it works, it is done when it feels smooth. That perspective shapes a lot of what we build.

## Training is about 3x faster

Over the past weeks, Janusch made many small optimizations to the backend. Each one alone looked minor — a few percent here, a few seconds there. Then we tried a bigger scene with five million Gaussians, and the numbers jumped off the screen: **a bit over 4 minutes instead of almost 13** for the same scene, on the same GPU.

Or as Kristof put it in the session: "My 3080 of today has the performance of a 5080 two months ago." The speed-up is already on master, so everyone gets it for free.

There is also quality work going on, especially around background optimization — but that is still in progress, so we will talk about it in a future session.

## What you asked for in the survey

We asked on the [portal](https://portal.lichtfeld.io) what you would like to see next, and 36 people sent in about 50 suggestions. The big themes were no surprise: training larger scenes, using less VRAM, and better editing tools.

The most interesting part was something else: **10 to 15 of the suggestions were things LichtFeld Studio can already do.** People just did not know about them. That tells us we need to do a better job showing what is already there — which is exactly why this video series and the new YouTube channel exist.

Every suggestion has now been turned into a ticket and grouped into epics. So if you want to contribute, you can look at the list and pick something that fits you.

## A LiDAR scanner is coming to the lab

Many of you use handheld LiDAR scanners, and you asked for better support. To improve that, we need our own data to test with. So Janusch asked on LinkedIn if anyone would donate a scanner — and the CEO of Tersus reached out. They are sending us a handheld LiDAR scanner, including the pose software.

The plan: the scanner software delivers the poses, and LichtFeld Studio does the splat training on top of the LiDAR data. Today, most tools throw that precise point cloud data away or let the algorithm ruin it. We want to actually use it — and become the first open-source tool that does.

## A fresh overview video

Kristof made a new video called "LichtFeld Studio — Everything it can do today". Instead of listing every new feature of one release, it gives a clean picture of what the platform is right now: viewing, training, editing, and extending. If you have not looked at LichtFeld Studio in a while, this is the best place to start. You can find it on our [YouTube channel](https://www.youtube.com/@LichtFeldStudio).

## Plugins, Python API, and MCP

A fun example of how far the plugin system has come: Kristof needed a quick way to enable and disable some of his cameras. Instead of writing the code himself, he connected an LLM to LichtFeld Studio through MCP and simply described what he wanted. The LLM wrote the whole plugin — buttons included. Now he clicks a button and it does the job.

If you did not know LichtFeld Studio has plugins and a Python API: it does, and you can hook into almost everything, even the trainer. The [docs](https://lichtfeld.io/docs) are a good starting point.

## From the community

Three community highlights from this session:

- **A solar eclipse in 3D.** Nik and his friends went to Tempelhofer Feld in Berlin with handheld camera rigs and captured people watching the eclipse — then turned the moments into splats with LichtFeld Studio. Capturing unique moments in 3D like this feels very different from a normal photo.
- **A better way to clean up splats.** Community member McGregor proposed a screen-space depth window for selection ([#1645](https://github.com/MrNeRF/LichtFeld-Studio/issues/1645)) — and did not just describe the idea, but sent a first pull request with a working prototype. That is open source at its best.
- **Measuring in the web viewer.** Jakob added an orthographic mode to the HTML web viewer export ([#1856](https://github.com/MrNeRF/LichtFeld-Studio/pull/1856)), which makes the measurement tool actually useful there. He needed the feature, built it, and now everyone has it.

## The .licht project format

Until now, a training run left you with a pile of separate outputs: checkpoints, PLY files, sidecar files. The new **.licht project format** puts everything into one project. Close LichtFeld Studio in the middle of a cleanup, reopen the project, and you are back where you stopped. Auto-save runs in the background, so even a crash only costs you a little. You can compare your reconstruction against the ground-truth cameras, jump into edit mode, and move the whole project to another computer as one file.

Shady is already building on top of it: his pull request ([#1770](https://github.com/MrNeRF/LichtFeld-Studio/pull/1770)) turns the Asset Manager into a real project manager for .licht projects.

The bigger shift is in how you work: you stop thinking in datasets and start thinking in projects. And it opens the door to what we want next — drop in a video, get a splat out, with everything resumable in between.

## What comes next

Version **0.5.4** is close. After that, master gets bug fixes only, so it becomes as stable as possible for the **0.6** release. All new features go into the dev branch in the meantime and get merged once 0.6 is out.

And the next session? It will be live, so you can join in and comment while we talk. See you there — and if you want the full story, [watch Session 1 on YouTube](https://youtu.be/uoSI_4RlvaY) or read the [newsletter](https://portal.lichtfeld.io/newsletter/v054-is-close-kristof-joins-the-team-and-what-you-asked-for/).

Thank you to Core11 and the portal members for funding the project, and to Tersus for the LiDAR scanner.
