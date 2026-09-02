---
title: "Session 2: How the Grace Cathedral Splat Was Made"
description: In the second LichtFeld Studio Session, Janusch talks with Vincent Woo about his Grace Cathedral splat. A year of capture, a crashed drone, 100 hours of hand alignment, a 10-million-Gaussian budget, the IGS build that made a blurred painting pop out, and a first look at his next project.
summary: Session 2 is on YouTube. Vincent Woo tells the story of the Grace Cathedral splat, from a Frankenstein camera rig and a crashed drone to 10 million Gaussians in the browser, plus a first look at his next project.
date: 2026-09-02
author: LichtFeld Studio
category: Sessions
tags:
  - session
  - youtube
  - grace-cathedral
  - capture
  - alignment
  - community
image: /static/blog/lichtfeld-studio-session-2.jpg
imageAlt: Janusch and Vincent Woo in the second LichtFeld Studio Session, next to the Grace Cathedral splat
featured: true
---

The second **LichtFeld Studio Session** is out. This time Janusch sits down with Vincent Woo, the creator of the [Grace Cathedral splat](https://vincentwoo.com/3d/grace_cathedral/), which is probably the most-seen Gaussian splat on the internet. In 42 minutes, Vincent tells the whole story: how the project started, how he captured a cathedral, why it took a year, and how LichtFeld Studio fits into it.

<iframe
  src="https://www.youtube-nocookie.com/embed/Ann_1Vqa-3k"
  title="LichtFeld Studio Session 2"
  style="width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 12px;"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin"
  allowfullscreen
></iframe>

Vincent has used LichtFeld Studio since the first early builds about a year ago. "I use your product very regularly, if not daily," he says. Here is a short version of what he told us.

## The goal: the best splat on the internet

Vincent does not do these projects for a client or a company. As he puts it, his "secret evil goal" was simply to produce the best splat on the internet, first with [Sutro Tower](https://vincentwoo.com/3d/sutro_tower/), then with Grace Cathedral. Behind that is a simpler wish: he wants regular people to open a 3D reconstruction in their browser and feel something.

Grace Cathedral was a coincidence. A friend was rigging a giant banner on the front of the church and invited Vincent to film it. He met people who work there and asked if he could scan the whole building with a totally unproven technology that "might take a year". It took a year. And he went back at least a dozen times, mostly to fix his own mistakes.

## A Frankenstein rig and a crashed drone

The capture setup is repurposed photography gear: a C-stand on wheels with several cameras clamped to it with magic arms, all triggered remotely. The only thing Vincent had to buy were the wheels. He calls it overkill today, and if he did it again he would rather put a 360 camera on a very long pole.

The interior is so tall that without aerial views the splat turns into "soup" as soon as you fly up. So Vincent flew a drone inside the cathedral. It hit an invisible piece of old fishing line and crashed, and the church, full of priceless relics and choir rigging, was "understandably very alarmed". Some of the upper windows still show less texture than the rest because of it.

## 3,000 photos on day one, then months of alignment

The first day of shooting produced about 3,000 photos. From there, Vincent worked iteratively: align, train, inspect every result visually, fix the alignment, repeat. What took him longest to learn was that many failures were not the aligner's fault but his own capture mistakes, and by the time he understood one, the scene had changed. Pianos and chairs had been moved, and at one point the church had built a new ceiling. He ended up hand-painting masks over hundreds of photos, not only to remove distractions like a stray coat but also to "mask out the absence" of the flowers he wanted to keep.

His favorite example is the maquette: a small model of the cathedral in a glass case that refused to converge. Vincent went back to shoot more coverage, and it got worse. The answer came to him lying awake at night. Someone had moved the case by an almost imperceptible amount between his visits, enough to break the alignment for that whole area.

In hours, capture was maybe 12 hours of actual shooting spread over months. Setting control points and re-aligning in RealityCapture was more like 100 hours.

## 10 million Gaussians, because the budget is the product

Vincent capped the highest detail level at about 10 million splats, with smaller levels around five and two and a half million below it. The scene must run on phones, and that limits how much you can reconstruct. "We can blow 100 million Gaussians on this and I can have an enormous file on my own computer, but it's useless. The point is that people can interact with it."

The lighting inside the church changes on an automated schedule, so he let the cameras choose their own exposure. The result is an aggregate HDR look that is more legible than the real building, which has much deeper shadows.

## The moment IGS landed

For Vincent, the thing that made the project work was LichtFeld Studio's **IGS densification**, which prioritizes edges and contrast when deciding where to add Gaussians. Before it, he was not excited to ship the models he had. After it, "a night and day difference".

One painting near the back of the church had very few views and lots of texture. For months it was a beige blur, and he had accepted that. Then one of the first IGS builds landed and it popped out, down to the specular highlights of the track lighting above it. "There it is. There was enough input data for this actually."

## The cutaway view

The roof coming off is the part everyone remembers. Hand-placed boxes cull the splats around them in a shader, and the glow along the cut edge hides the smeared splats where the cut would otherwise look wrong. Vincent hopes people copy it. He thinks this is where architectural representation is heading, and that splat-to-mesh work will eventually make the hand placement unnecessary.

## Feed-forward models and the craft

The day before the session, Atlas was released. Does a model that turns ten photos into a scene make a year of capture obsolete? Vincent is not worried. He is looking forward to it. His thousands of photos are mostly redundant, so it is no surprise that compute can get there with far fewer. He is not a surveyor, and the precision of his scans is a side effect of chasing beauty. What he wants you to feel is a connection to a building that a century of people have moved through. If a feed-forward model gets there, he will use it too.

## Next: the grain silos

Vincent gave us a first look at his next project, which is training in the background while he talks: the abandoned grain silos of San Francisco, a graffiti haven for thirty years that is now being demolished. The plan is to segment every tag and lift it into 3D, so the artists can claim their work and add their own story to it. The background is already his best yet, with Sutro Tower visible in the distance. The long-term plan is a splat map of the whole city. "Next August you'll see the next one."

Watch [Session 2 on YouTube](https://youtu.be/Ann_1Vqa-3k), then go explore the [Grace Cathedral splat](https://vincentwoo.com/3d/grace_cathedral/) yourself. Thank you to Vincent for the insights, and to Core11 and the portal members for funding the project.
