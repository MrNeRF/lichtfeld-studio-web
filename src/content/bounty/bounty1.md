---
title: Speed up training
date: 2025-06-23
summary: This bounty challenges you to speed up training by at least 100% (halfing the runtime), without compromising results.
winner: (won by Florian Hahlbohm)
---
Help us **cut training time in half** and earn **$1500**!  
This bounty challenges you to speed up training by at least **100%** (halfing the runtime), without compromising results.

Update: https://github.com/vincentwoo adds another $300 => $600 in total!
Update: https://github.com/mazy1998 adds another $300 => $900 in total!
Update: https://github.com/toshas adds $200 => $1100 in total!
Update: https://x.com/ChrisAtKIRI adds $200 => $1300 in total!
Update: https://github.com/julien-blanchon adds $100 => $1400 in total!
Update: [Drew Moffitt](https://www.linkedin.com/in/drew-moffitt-gisp-0a4522157?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app) adds $100 => $1500

> 🔁 The winning implementation will be merged, and the repository will switch to a **GPLv3 license**.

---

## 🧾 Rules

1. **Fork the repository**, including all branches, starting from:  
   👉 [`bounty_001` branch](https://github.com/MrNeRF/gaussian-splatting-cuda/tree/bounty_001)

2. **Use this script to benchmark performance**:  
   🕒 [`timing_mipnerf360.sh`](https://github.com/MrNeRF/gaussian-splatting-cuda/blob/bounty_001/scripts/timing_mipnerf360.sh)

3. **Apply your speed-up** and submit a **pull request**.

4. **Do not degrade quality** – final metrics (e.g., PSNR/SSIM) must remain consistent with the baseline.

5. Target a **minimum of 100% speed-up** compared to the current implementation.

6. Use the official **MipNeRF360 dataset**:  
   📦 [360_v2.zip](http://storage.googleapis.com/gresearch/refraw360/360_v2.zip)

7. **Deadline:**  August 2, 2025 at 11:59 PM PST (midnight) 
   ⏳ All results will be reviewed and the winner announced shortly after.

8. If multiple entries achieve similar speed-ups:
   - The **cleanest** and **earliest** implementation will win.
   - Final decision rests with the repo maintainer.

9. Your pull request must include a **clear summary** of:
   - What you optimized
   - How you achieved the speed-up

10. You **must not use any code that is licensed under a non-permissive license**

11. By participating, you agree to release your submission under the **GPLv3 license**.

12. You must not alter the data loading to pull all data on gpu. Datasets with thousands of images must still work!

13. Loss logging and saving must still work. You must not strip the functionality. It must be possible to merge the final pr directly without adding back losses, savings, etc. 

---

## 🏆 Prize

- 💸 **$1500** to the author of the winning pull request.
- 🧠 Bonus: Your name (or alias) will be featured in the repository’s README.

---

## 📣 Discussion

Join our Discord server to discuss ideas, ask questions, or get help:  
👉 [https://discord.gg/6FaYg29MN7](https://discord.gg/NqwTqVYVmj)

---

Good luck, and happy hacking! 🚀

**Benchmark (RTX 4090)**

| Scene     | Time     |
|-----------|----------|
| garden    | 6m 18s   |
| bicycle   | 5m 44s   |
| stump     | 5m 44s   |
| bonsai    | 7m 43s   |
| counter   | 8m 37s   |
| kitchen   | 8m 15s   |
| room      | 7m 29s   |
| **Total** | **49m 50s** |


| Scene    | Iteration | PSNR          | SSIM         | LPIPS        | Num Gaussians |
| -------- | --------- | ------------- | ------------ | ------------ | ------------- |
| garden   | 30000     | 27.174416     | 0.857002     | 0.157627     | 1000000       |
| bicycle  | 30000     | 25.398046     | 0.777291     | 0.255703     | 1000000       |
| stump    | 30000     | 26.797558     | 0.794485     | 0.258573     | 1000000       |
| bonsai   | 30000     | 32.632896     | 0.948878     | 0.248194     | 1000000       |
| counter  | 30000     | 29.357792     | 0.917621     | 0.242679     | 1000000       |
| kitchen  | 30000     | 31.866880     | 0.934161     | 0.155137     | 1000000       |
| room     | 30000     | 32.075516     | 0.930377     | 0.276833     | 1000000       |
| **mean** | **30000** | **29.329015** | **0.879974** | **0.227821** | **1000000**   |
