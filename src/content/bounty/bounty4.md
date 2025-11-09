---
title: 'Automatic Per-Scene Hyperparameter Optimization'
date: 2025-09-14
deadline: 2025-11-09
summary: 'Build a system that automatically finds optimal hyperparameters for each scene.'
winner: ''
---
**Build a system that automatically finds optimal hyperparameters for each scene.**

**Challenge.** Different scenes need different hyperparameters. Create an automatic optimization system (RL-based or other approaches) that discovers the best settings *per scene* during training without manual tuning and scales to new scenes.

💸 **Prize Pool: $2,430**

* [AukiNetwork](https://x.com/auki): $1,000
* [Vincent Woo](https://vincentwoo.com/): $500
* [MrNeRF](https://x.com/janusch_patas): $300
* [Yehe Liu](https://x.com/YeheLiu): $280
* [Kenneth Lynne](https://kenneth.ly/nne): $200
* [Florian Hahlbohm](https://fhahlbohm.github.io): $100
* [Mazeyar Moeini](https://x.com/mazy1998): $50

---

## 🧾 Rules

1. **Fork from** the `bounty_004` branch.
2. **Automatic per-scene optimization** must run during training (no manual per-scene tuning).  Your solution should be able to tune parameters such as:

   * Learning rates (e.g., position, scale, rotation, opacity, SH)
   * Densification thresholds and intervals
   * **Number of iterations** (treated as a hyperparameter)
   * **Number of Gaussians** (see densification below)
   * Any other parameters that affect quality or convergence

   => For instance, changing only the number of iterations as main driver does not qualify! It should be clear that the system tries to figure out an optimal configuration over a none trivial subset of parameters. 

3. **Densification strategy: MCMC.** The approach must use **MCMC-based densification**; the **number of Gaussians is a tunable hyperparameter.**
4. **Target improvement:** Achieve an average **+0.15 dB PSNR** improvement *over baseline* on the MipNeRF360 dataset (and further scenes). See benchmarks below.

## Quality Metrics Summary

| Scene    | Iteration | PSNR    | SSIM     | LPIPS    | Num Gaussians |
|----------|-----------|---------|----------|----------|---------------|
| garden   | 30000     | 27.8539 | 0.862883 | 0.107563 | 4,937,304     |
| bicycle  | 30000     | 25.7642 | 0.785712 | 0.188216 | 5,684,053     |
| stump    | 30000     | 26.9556 | 0.810134 | 0.213571 | 4,647,623     |
| bonsai   | 30000     | 32.5415 | 0.953107 | 0.246894 | 1,120,498     |
| counter  | 30000     | 29.2535 | 0.929803 | 0.244577 | 886,049       |
| kitchen  | 30000     | 31.5344 | 0.935762 | 0.154214 | 1,129,135     |
| room     | 30000     | 32.0918 | 0.936561 | 0.272640 | 1,199,942     |
| **mean** | **30000** | **29.4278** | **0.887709** | **0.203954** | **2,800,657** |

5. **Dataset:** Use the official MipNeRF360 dataset: 📦 `360_v2.zip` → [http://storage.googleapis.com/gresearch/refraw360/360_v2.zip](http://storage.googleapis.com/gresearch/refraw360/360_v2.zip)
6. **Generalization test:** Your method **will be evaluated on one or two undisclosed scenes** in addition to MipNeRF360. Approaches must **scale beyond MipNeRF360** without scene-specific hacks.
7. **Licensing:** You may only use **GPLv3-compatible dependencies** (e.g., MIT, Apache-2.0, BSD, GPLv3, etc.). List all third-party deps in your README with licenses.
8. **Implementation language:**

   * **Preferred:** C++ implementation committed to `bounty_004` branch.
   * **Alternative:** Python implementations are accepted, **but total award is reduced by 20%.**

9. **Reproducibility:** Provide a single command (or script) to reproduce your results per scene, including fixed seeds where relevant.

> **Important:** Results are **not only measured via PSNR** - they will also be **visually inspected** for artifacts (ghosting, floaters, oversmoothing, texture shimmering, etc.).

---

## 💡 Approach Ideas (non-exhaustive)

* Reinforcement learning (e.g., RLGS-style controllers)
* Bayesian optimization (e.g., model-based HPO)
* Meta-learning / per-scene adaptation
* Gradient-based hyperparameter optimization
* Population-based training / schedule-free optimizers
* Your novel approach!

**Helpful starting points:**

* Schedule-Free Optimizers (Facebook Research): [https://github.com/facebookresearch/schedule_free](https://github.com/facebookresearch/schedule_free)
* SMAC (AutoML / Bayesian optimization): [https://github.com/automl/SMAC3](https://github.com/automl/SMAC3)
* PyTorch Lightning Tuner: [https://lightning.ai/docs/pytorch/stable/api/lightning.pytorch.tuner.tuning.Tuner.html](https://lightning.ai/docs/pytorch/stable/api/lightning.pytorch.tuner.tuning.Tuner.html)
* (RLGS: Reinforcement Learning-Based Adaptive Hyperparameter Tuning for Gaussian Splatting): [https://arxiv.org/pdf/2508.04078](https://arxiv.org/pdf/2508.04078)

---

## 📦 Submission Requirements

Your PR must include:

1. **Working implementation** on `bounty_004` branch (C++ preferred; Python accepted with 20% award reduction).
2. **Automation entrypoint** (script/CLI) to run the optimizer per scene.
3. **Results table** covering all MipNeRF360 scenes: PSNR, SSIM, LPIPS, training time, #iterations, #Gaussians, and key hyperparameters found.
4. **Visuals:** A short gallery (or links) with representative renders for at least 3 scenes highlighting improvements.
5. **Technical brief** describing the optimization strategy, search space, controller/optimizer, and any constraints/priors.
6. **License & dependencies** section listing all third-party libraries and their licenses (must be GPLv3-compatible).

---

## 🗓️ Deadline

**October 12, 2025 at 11:59 PM PST**

---

## 💰 Prize Distribution

* **70%** to the **winning PR**
* **30%** shared among strong qualifying submissions that meet all requirements

Organizers reserve the right to adjust awards for ties or extraordinary contributions.

---

## 📫 Questions

Open an issue or discuss in the designated thread on [discord](https://t.co/lrl64WGvlD).

**Good luck, and happy hacking! 🚀**
