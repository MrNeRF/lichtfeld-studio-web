---
title: "Opening LichtFeld Studio to Python"
description: "Why LichtFeld Studio uses nanobind for Python bindings, what DLPack adds for tensor workflows, and what plugin authors can do with the API."
summary: "LichtFeld Studio's Python API is built around one boundary and two protocols: nanobind exposes native application objects, and DLPack lets tensors move between LichtFeld Studio and libraries like PyTorch or CuPy without copying."
date: 2026-07-03
author: LichtFeld Studio
category: Engineering
tags:
  - python
  - nanobind
  - dlpack
  - plugins
  - tensors
  - zero-copy
  - 3d-gaussian-splatting
image: /static/blog/lichtfeld-python-dlpack-schema.svg
imageAlt: Diagram of LichtFeld Studio's Python boundary, where nanobind moves application objects across it, DLPack shares tensor buffers, and lf.Tensor and PyTorch point at the same CUDA memory
featured: false
---

A useful plugin should not have to leave the editor. If a scene is already open, a script should be able to inspect it, select part of it, render a diagnostic image, or run a tensor operation on the splats in place.

That is the role of the Python layer in LichtFeld Studio. It is not a file conversion workflow around the application. It is an in-process API over the scene, tensors, rendering, training, UI, plugins, and undo system.

The boundary has two parts:

- `nanobind` exposes native C++ objects to Python.
- DLPack exchanges tensor buffers with Python tensor libraries.

Nanobind makes the application scriptable. DLPack makes tensor-heavy plugins practical.

## Why nanobind?

`pybind11` would be a reasonable choice. It is mature, familiar, and widely used. LichtFeld Studio uses `nanobind` because the binding layer is large enough that build cost, binary size, and call overhead matter.

The Python surface touches scene nodes, splat data, tensors, cameras, selection, render helpers, operators, panels, training hooks, plugin state, and undo. Nanobind keeps the binding style close to pybind11 while targeting faster compilation, smaller extension binaries, and lower runtime overhead in its own benchmark suite.

The claim is not that nanobind is always better. The claim is narrower: for a modern C++ application with a broad Python plugin API, nanobind is a better fit than carrying a heavier binding layer.

For plugin authors, the result is straightforward. Python gets real application objects, not a command protocol. A plugin can call `lf.get_scene()`, inspect a node, register a panel, render a view, or update a selection through the `lichtfeld` module. The module also ships generated type stubs — regenerated at build time with nanobind's stubgen — so editors can autocomplete the whole API surface.

The binding layer is also explicit about threading. Long-running native calls, such as issuing training commands, release the GIL so the application never stalls behind Python, and native code re-acquires it before invoking Python callbacks like training hooks. A plugin author gets normal-looking Python; the locking discipline lives on the C++ side of the boundary.

## What DLPack adds

Nanobind gets objects across the Python boundary. It does not solve tensor exchange by itself.

LichtFeld Studio's tensors live in its own tensor library — a reference-counted CPU/CUDA tensor with no LibTorch dependency. That keeps the application lean, but it also means PyTorch and CuPy have no idea what an `lf.Tensor` is. Something has to translate.

DLPack is a shared tensor interchange protocol. A producer exposes a tensor through `__dlpack__` and `__dlpack_device__`; a consumer imports it through its own DLPack path. `lichtfeld.Tensor` implements that protocol directly:

- `Tensor.__dlpack__`
- `Tensor.__dlpack_device__`
- `Tensor.from_dlpack(...)`

That means a plugin can hand a LichtFeld tensor to PyTorch or CuPy, run custom logic, and hand a result back:

```python
import lichtfeld as lf
import torch

scene = lf.get_scene()
model = scene.combined_model()

opacity = torch.from_dlpack(model.opacity_raw)
mask = torch.sigmoid(opacity[:, 0]) < 0.01

model.soft_delete(lf.Tensor.from_dlpack(mask))
scene.notify_changed()
```

The exchange itself does not copy. On export, `__dlpack__` hands out a capsule whose data pointer is the tensor's own buffer — including real strides for non-contiguous tensors — while a reference keeps the memory alive for as long as the consumer holds it. On import, `from_dlpack` wraps the incoming buffer in place and holds the producer's deleter, so the source cannot disappear underneath it. In the example above, `opacity` in PyTorch and `opacity_raw` in LichtFeld are the same CUDA allocation.

It is not magic: derived values like `get_opacity()` allocate a fresh tensor before export, and another library may still copy if it needs a different layout or device. The point is that the plugin does not have to export a file, round-trip through NumPy, or rebuild the scene just to use the Python tensor ecosystem. (When NumPy is what you actually want, `lf.Tensor` also implements `__array__`, so `np.asarray(t)` is zero-copy for contiguous CPU tensors.)

Zero-copy views raise an obvious safety question: what happens if the scene changes while Python still holds a view? Each borrowed view is stamped with the scene generation it came from. If the scene has moved on since — say the splats were re-densified — touching the stale view raises a clear "tensor data invalidated" error instead of silently reading memory that may have been freed or reused.

For CUDA tensors, the handoff is also stream-aware. When a consumer passes its stream to `__dlpack__`, LichtFeld records an event on the tensor's home stream and makes the consumer's stream wait on it — a GPU-side ordering, not a device-wide sync. The event comes from a pooled allocator, the same primitive the tensor library already uses internally to keep its memory pools stream-safe. Passing no stream falls back to a full synchronize of the home stream. In the other direction, `from_dlpack` asks the producer for the tensor on LichtFeld's current stream and homes the imported tensor there. That keeps asynchronous GPU work explicit instead of pretending every tensor operation is globally synchronized.

## Raw data versus useful values

The splat API mostly separates storage views from computed values. One detail is worth calling out: `shN_raw` is canonicalized for Python, so it is materialized from the internal swizzled storage instead of returned as a direct view.

| API | What you get |
|---|---|
| `means_raw` | `[N, 3]` position storage view |
| `sh0_raw` | `[N, 1, 3]` base SH storage view |
| `shN_raw` | canonical `[N, K, 3]` higher-order SH tensor, materialized from internal storage |
| `scaling_raw` | `[N, 3]` log-space scale storage view |
| `rotation_raw` | `[N, 4]` quaternion storage view |
| `opacity_raw` | `[N, 1]` logit-space opacity storage view |
| `get_scaling()` | `[N, 3]` scale after `exp` |
| `get_rotation()` | `[N, 4]` normalized quaternions |
| `get_opacity()` | `[N]` opacity after `sigmoid`, squeezed |
| `get_colors_rgb()` | `[N, 3]` base color decoded from the SH DC term |

Use the raw accessors when you need the closest Python-facing representation of model storage. Use computed getters when you need values in the form a tool or algorithm expects — `get_colors_rgb()` and `set_colors_rgb()`, for example, hide the spherical-harmonics DC encoding entirely. Use DLPack when another tensor library should operate on the data.

## What Python can do

The `lichtfeld` module is the public application surface for plugins, organized into submodules such as `lf.scene`, `lf.ui`, `lf.io`, `lf.plugins`, `lf.undo`, `lf.animation`, and `lf.mcp`. It can:

- load, inspect, and modify scenes;
- add splats, point clouds, meshes, cameras, and groups;
- read and write transforms;
- work with Gaussian selection masks and selection groups;
- render views to tensors and capture the viewport;
- start, pause, resume, stop, and observe training;
- register panels, operators, menus, properties, tools, and UI hooks;
- show tensor images with `ui.image_tensor` or `DynamicTexture`;
- store plugin settings;
- push undo steps and grouped undo transactions;
- register capabilities that other plugins can call.

And that list is still not exhaustive. The same surface covers animation tracks and keyframes, viewport gizmos, keymaps, a composable selection/edit pipeline DSL, dependency installation through `lf.packages` (backed by `uv`), and registering MCP tools so agents can drive the editor. In development builds, a hot-reload watcher picks up plugin source changes without restarting the application.

The tensor object itself is intentionally familiar: constructors like `zeros`, `ones`, `rand`, `from_numpy`, `cat`, and `stack`; properties like `shape`, `dtype`, `device`, and `is_cuda`; and common operations such as indexing, comparisons, reductions, reshaping, permutation, and matrix multiplication.

The goal is simple: a plugin can start as a small script, but still reach real scene data when it needs to.

## The boundary matters

A Python API that only wraps import and export is easy to build, but every plugin pays for it. Tools become file pipelines. Iteration gets slower. Tensor workflows bounce through CPU memory even when the data started on the GPU.

LichtFeld Studio's approach keeps the scene and tensors owned by the application, exposes them through nanobind, and uses DLPack when Python tensor libraries need to participate. That is the useful split: native ownership inside the editor, Python control at the edge, and tensor interop without turning every workflow into serialization.

Further reading:

- [LichtFeld Studio plugin API reference](https://github.com/MrNeRF/LichtFeld-Studio/blob/main/docs/plugins/api-reference.md)
- [nanobind: why another binding library?](https://nanobind.readthedocs.io/en/latest/why.html)
- [nanobind benchmarks](https://nanobind.readthedocs.io/en/latest/benchmark.html)
- [DLPack Python specification](https://dmlc.github.io/dlpack/latest/python_spec.html)
- [Array API `__dlpack__` stream semantics](https://data-apis.org/array-api/draft/API_specification/generated/array_api.array.__dlpack__.html)
