---
title: 'Make densification obsolete'
date: 2025-08-10
deadline: 2025-09-07
summary: 'This bounty aims to improve training quality without using densification by providing a stronger initialization.'
winner: ''
---
The quality of 3D Gaussian Splatting (3DGS) depends strongly on the initial point cloud. This bounty aims to improve training quality **without** using densification by providing a stronger initialization. Ideally, this transfers to the training with densification.

**Goal:** Provide a method to initialize training with a better point cloud that improves final quality.
**Bonus:** Match or beat the **densified** baseline metrics using only your improved initialization.

---

## 🔧 Rules

* **No densification.** Use the [MipNeRF360 dataset](http://storage.googleapis.com/gresearch/refraw360/360_v2.zip) and the original poses. The reference metrics below were generated **with densification disabled** for **30k** steps using `./scripts/bounty_002_disabled_densification.sh`.
  Your solution must reach **mean PSNR ≥ 28.0** without densification after 30k steps to qualify.

```
==============================================================================
QUALITY METRICS SUMMARY
==============================================================================
scene      iteration  psnr       ssim       lpips      num_gaussians  
------------------------------------------------------------------------------
garden     30000      24.4267    0.698950   0.367346   138,766        
------------------------------------------------------------------------------
bicycle    30000      22.0596    0.584871   0.507605   54,275         
------------------------------------------------------------------------------
stump      30000      22.5856    0.636969   0.566039   32,049         
------------------------------------------------------------------------------
bonsai     30000      28.6492    0.921540   0.329062   206,613        
------------------------------------------------------------------------------
counter    30000      26.4455    0.891156   0.333817   155,767        
------------------------------------------------------------------------------
kitchen    30000      28.0873    0.901104   0.225270   241,367        
------------------------------------------------------------------------------
room       30000      29.2352    0.907292   0.362466   112,627        
------------------------------------------------------------------------------
==============================================================================
mean       30000      25.9270    0.791697   0.384515   134,494        
==============================================================================
```

* Ideally, the solution is directly mergeable into the repo. A Python-only solution is allowed if it uses deep learning or Python-only deps.

* Third-party code must be GPLv3-compatible. Allowed: MIT, Apache 2.0, BSD. Not allowed: DUSt3R, MAST3R, VGGT (including commercial licenses).

* Your contribution must be licensed as **GPLv3**.

* Running `scripts/bounty_002_full_eval` on standard benchmarks may not degrade metrics. The initialization should ideally improve them. An undisclosed dataset will be used to check for overfitting or dataset bias. The reference results are included here: 

```
==============================================================================
QUALITY METRICS SUMMARY
==============================================================================
scene      iteration  psnr       ssim       lpips      num_gaussians
------------------------------------------------------------------------------
garden     30000      27.8539    0.862883   0.107563   4,937,304
bicycle    30000      25.7642    0.785712   0.188216   5,684,053
stump      30000      26.9556    0.810134   0.213571   4,647,623
bonsai     30000      32.5415    0.953107   0.246894   1,120,498
counter    30000      29.2535    0.929803   0.244577   886,049
kitchen    30000      31.5344    0.935762   0.154214   1,129,135
room       30000      32.0918    0.936561   0.272640   1,199,942
------------------------------------------------------------------------------
mean       30000      29.4278    0.887709   0.203954   2,800,657
==============================================================================
```

* Random initialization does not qualify. Reusing a 3DGS trained model (a ***final splat***) or **intermediate** checkpoints of the 3DGS pipeline as initial point cloud is not allowed. Build a genuine initialization and don't try to fake it.

* The method must run on consumer hardware with **≤ 24 GB VRAM**. It must scale to large datasets with no hard cap on the number of images. **2k–3k images** or larger datasets must work. Preprocessing time must be **≤ 50%** of a scene’s full training time. Example: if full training with densification takes 8 minutes, your preprocessing may take at most 4 minutes.

* Avoid massive floaters. Visual results will be inspected.

* Your pull request must include a concise summary of your approach.

* Collaboration is welcome. You may work individually or form teams. Join the [MrNeRF & Brush Discord](https://discord.gg/NqwTqVYVmj) to discuss ideas, share progress, and connect with other participants.

**Bonus goal: additional \$500** 
1. Match or exceed the **densified** baseline metrics from `scripts/bounty_002_full_eval` **without** using densification. Optimize only the **initial point cloud**. You can run the same script with `--disable-densification` to verify.

or 

2. Demonstrate that your method significantly reduces floaters.

---

## ⏰ Deadline

**September 7, 2025, 11:59 PM PST**

---

## 💰 Prize

* **\$2,600** for the base challenge.
* **+ \$500** for the bonus goal.

**Sponsors:**
[MrNeRF](https://x.com/janusch_patas) \$300 + \$500 bonus goal
[Martin Casado](https://x.com/martin_casado) \$1000
[Nils Pihl](https://x.com/broodsugar) \$1000
[Florian Hahlbohm](https://x.com/fhahlbohm) \$100
[Mazeyar Moeini](https://x.com/mazy1998) \$100
[YeheLiu](https://x.com/YeheLiu) \$100

**Payout:** 70% to the winner, 30% shared among other successful participants.

---

## Credit
Initial idea for this bounty by [Florian Hahlbohm](https://x.com/fhahlbohm).

---

## Discord
[discord.gg/NqwTqVYVmj](https://t.co/lrl64WGvlD)

---

## Submission

1. Open a pull request with your implementation towards the [bounty_002](https://github.com/MrNeRF/gaussian-splatting-cuda/tree/bounty_002) branch. All necessary script are there.
2. Include a short method summary, runtime and VRAM stats, and commands to reproduce results.
3. Cite any third-party code and licenses used.
4. Provide metrics on MipNeRF360 with densification disabled and show that mean PSNR ≥ 28.0.
5. If attempting the bonus, also report the full-eval comparison.

---

## Literature for inspiration

* [https://arxiv.org/abs/2504.13204v1](https://arxiv.org/abs/2504.13204v1)
* [https://arxiv.org/abs/2403.09413](https://arxiv.org/abs/2403.09413)

Hint by [Ke Li](https://x.com/KL_Div/status/1954799627867152598) "You might be interested in this: [https://zvict.github.io/papr/](https://t.co/gTpWnRxGEk) (essentially the tails of Gaussians cause vanishing gradients, and you can get around it by learning an interpolation kernel)"
* [https://arxiv.org/abs/2307.11086](https://arxiv.org/abs/2307.11086)
---

## Notes

* If your method needs new dependencies, justify them and keep setup simple.
* Reproducibility matters. Please fix seeds where applicable and document data preprocessing.
* Rules can be adjusted if necessary.