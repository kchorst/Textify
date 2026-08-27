# References, Influences, and Development Notes

**Textify 4.47.1**

Textify is an original browser-extension implementation, but its Stipple and Single-Line/TSP modes belong to a much older and richer family of computational-art techniques. This document records the research, public examples, practical references, and visual targets that influenced the release, and explains where Textify follows those ideas and where it deliberately diverges.

The goal is not merely legal attribution. It is also a development record for artists, researchers, programmers, and users who want to understand how the release arrived at its final rendering behavior.

## 1. The central artistic idea

The two release features that required the most research were **Stipple** and **Single-Line/TSP**.

Stipple represents tone with point density: darker regions receive more or tighter marks, lighter regions receive fewer or more widely spaced marks. Single-Line/TSP begins with the same broad idea, but treats the generated marks as “cities” and routes one continuous line through them.

The release was therefore shaped by two connected questions:

1. How should an image be converted into a spatial distribution of points that preserves tone, structure, and recognizable features?
2. How should those points be connected into a useful continuous-line drawing without destroying the image through long bridges, crossings, or excessive maze-like structure?

Those questions are directly related to the work cited below.

## 2. Adrian Secord — Weighted Voronoi Stippling

A foundational research reference was Adrian Secord's **“Weighted Voronoi Stippling”** (NPAR 2002). Secord describes generating stipple drawings from grayscale images using weighted centroidal Voronoi diagrams. The important artistic principle is simple and powerful: stipples should be distributed so their density conveys image tone while remaining well spaced enough to avoid artificial clumps and unwanted patterns.

Reference:
- Adrian Secord, *Weighted Voronoi Stippling*, NPAR 2002, pp. 37–43.
- DOI: https://doi.org/10.1145/508530.508537
- Preprint: https://www.cs.ucdavis.edu/~ma/SIGGRAPH02/course23/notes/papers/Secord.pdf

### Influence on Textify

Textify's **Stipple Classic / Adaptive** and **Single-Line Voronoi / Organic** modes are influenced by the weighted-density and centroidal/Voronoi approach. The release does not embed Secord's code or a third-party Voronoi package. Instead, Textify uses browser-native JavaScript implementations and bounded approximations suitable for an interactive extension.

The development also retained Secord's core visual lesson: an image should not be represented merely by edge detection. Broad dark regions must still receive marks, while light regions need space.

## 3. Robert Bosch and Adrianne Herman — continuous-line drawings through TSP

Robert Bosch and Adrianne Herman's **“Continuous Line Drawings via the Traveling Salesman Problem”** described a direct method for converting image tone into city locations and then using a TSP solution to make a continuous line drawing.

Reference:
- Robert Bosch and Adrianne Herman, *Continuous Line Drawings via the Traveling Salesman Problem*, Operations Research Letters 32(4), 2004, pp. 302–303.
- DOI: https://doi.org/10.1016/j.orl.2003.10.001
- Oberlin repository: https://digitalcommons.oberlin.edu/faculty_schol/2423/

### Influence on Textify

This is one of the clearest conceptual ancestors of Textify's **Single-Line** mode: distribute cities according to the target image, route through them, then render the route as artwork.

Textify differs in several important ways:

- It runs entirely inside a browser extension rather than calling an external exact TSP solver.
- It uses bounded heuristic routing designed to complete interactively on ordinary user hardware.
- The release path is intentionally **open** rather than forcibly closing the final vertex back to the first. This was chosen because a forced closing segment created visually destructive long connectors in portrait work.
- Textify exposes multiple city-generation styles rather than one single TSP-art formulation.

## 4. Craig S. Kaplan and Robert Bosch — TSP Art

Craig S. Kaplan and Robert Bosch's **“TSP Art”** (Bridges 2005) was especially important because it examines alternative ways to distribute cities and shows that city placement can be as artistically important as the tour itself. The paper includes weighted Voronoi and ordered-dither-based approaches and discusses the characteristic maze-like structures that can emerge from ordered patterns.

Reference:
- Craig S. Kaplan and Robert Bosch, *TSP Art*, Bridges 2005, pp. 301–308.
- Bridges archive: https://archive.bridgesmathart.org/2005/bridges2005-301.html
- Project page: https://cs.uwaterloo.ca/~csk/other/tsp/

### Influence on Textify

This work influenced the decision to make Single-Line a family of distinct renditions rather than a single algorithm:

1. **Classic / Marilyn** — tone-first local city grammar.
2. **Voronoi / Organic** — weighted organic/centroidal behavior.
3. **Dithered / Maze** — ordered tonal structure.
4. **Textured / Directional** — organic placement plus directional routing behavior.

The final release keeps these styles materially different while sharing one routing core.

## 5. Bryce Bayer — ordered dithering

Textify's **Dithered / Bayer** Stipple style and **Dithered / Maze** Single-Line style use ordered threshold structure associated with the Bayer matrix.

Reference:
- Bryce E. Bayer, *An Optimum Method for Two-Level Rendition of Continuous-Tone Pictures*, IEEE International Conference on Communications, 1973, pp. 26-11–26-15.

### Influence on Textify

Bayer-style ordered thresholds give Textify a deterministic alternative to random or centroidal placement. The resulting order is normally considered an artifact in conventional halftoning, but in computational art that structure can become a deliberate aesthetic feature. This is particularly visible in the Maze variant.

## 6. Robert Bosch's TSP art and optimization-art examples

Robert Bosch's broader “Opt Art” work was an artistic reference throughout development. His work demonstrates how mathematical optimization can produce images that look abstract or densely geometric at close range while resolving into recognizable portraits from a distance.

References:
- Robert Bosch, *Opt Art* survey: https://www2.oberlin.edu/math/faculty/bosch/optart_survey.pdf
- University of Waterloo TSP Art instances and references: https://www.math.uwaterloo.ca/tsp/data/art/index.html

These examples reinforced several release goals: city density must carry tone, the route should avoid visually dominant crossings, and a successful result must be judged both close-up and at portrait-viewing distance.

## 7. Jack Morris (`jxmorris12`) — practical public implementation reference

During development, the public **traveling-salesman-art** project and write-up by Jack Morris were evaluated as an engineering/reference implementation.

References:
- Write-up: https://jxmo.io/posts/traveling-salesman-art
- Archived GitHub repository: https://github.com/jxmorris12/traveling-salesman-art

Morris's write-up is useful because it documents the practical progression from an edge/gradient-driven point selector to weighted Voronoi stippling, and explicitly observes a failure mode that also mattered in Textify: an edge-only method can preserve boundaries while losing broad regions of dense tone.

### Relationship to Textify source

Textify does **not** bundle Morris's repository, does not use it as a runtime dependency, and does not claim his source as Textify code. It was examined as a public implementation and explanatory reference while Textify's production browser algorithms were developed independently in JavaScript.

## 8. The Marilyn reference image and visual qualification

A user-supplied **Marilyn Monroe single-line/TSP image**, described during development as an approximately **11,508-city** reference, became the canonical visual target for Textify's Classic / Marilyn direction.

The reference was not treated as a pixel template. It was studied for visual properties:

- most visible line segments are short and local rather than long sweeping connectors;
- dark regions contain substantially greater local line density;
- lighter regions retain visible spacing;
- recognizable facial form emerges from density and local routing rather than from tracing a few long contours;
- the result works at two scales: abstract line structure close up, portrait recognition at normal viewing distance.

The reference image itself is **not bundled or redistributed** with Textify. Its exact original provenance was not preserved in the release repository, so this documentation does not assign an artist or copyright owner without evidence. The broader TSP-art lineage associated with Bosch, Herman, and Kaplan is credited above.

## 9. Audrey and Rai development images

Two additional user-provided portrait images, referred to throughout development as **Audrey** and **Rai**, were used as regression/qualification images. They were important because a single reference portrait can hide algorithmic weaknesses.

They were used to check:

- human-face fidelity across different lighting and facial structure;
- whether dense backgrounds overwhelm the subject;
- whether a method works only on one “friendly” portrait;
- whether calibrated defaults remain usable across images rather than being overfit to Marilyn.

These development images are not bundled in the shipping package.

## 10. What Textify adds

The final release is not a direct implementation of any single paper. The production system combines ideas from several traditions with release-specific engineering and visual calibration.

Textify-specific work includes:

- four Stipple renditions with independent controls and calibrated defaults;
- variable-radius Blue Noise / Poisson placement with progressive exclusion-radius relaxation and requested-count fill behavior;
- portrait/background suppression heuristics and feature-support weighting;
- four Single-Line city-generation styles with a common browser-safe route builder;
- multi-fragment or space-filling route seeding depending on workload;
- bounded local 2-opt improvement;
- long-bridge and selected-crossing repair;
- an open-path finalization step chosen for the release's portrait aesthetic;
- directional/anisotropic routing for the Textured style;
- deterministic geometry caching so display Zoom does not force an expensive reroute;
- style-specific control ranges and reset calibration developed through repeated browser qualification;
- a unified extension UI and local-only processing/export pipeline.

## 11. How the final calibration was reached

The release went through many iterative candidates because mathematical correctness did not automatically produce acceptable artwork.

The final process was empirical as well as algorithmic:

1. Compare generated portraits against the reference images at full view and close range.
2. Identify failure types: edge-only portraits, broad maze coverage, excessive long bridges, background domination, sparse facial planes, or unresponsive controls.
3. Change the underlying city/point distribution or route logic when a control could not solve the failure.
4. Keep distinct Stipple/TSP variants genuinely different rather than turning every preset into one “best” algorithm with cosmetic parameter changes.
5. Freeze variants once browser-qualified rather than repeatedly destabilizing accepted modes.
6. Use final user-controlled settings as release defaults and extend slider ranges around those calibrated values so users retain meaningful adjustment in both directions.
7. Run runtime branch tests, geometry-count tests, package checks, and final visual qualification before release acceptance.

This is why `PROCESS.md` contains the mechanical transformation pipeline while this file records the intellectual and artistic path that shaped it.

## 12. Attribution boundary

The release package contains no external JavaScript solver, Voronoi library, TSP library, framework, web font, or third-party media asset. The cited papers, websites, repositories, and development images are **references and influences**, not bundled runtime dependencies.

Where a public code repository was examined, that fact is stated explicitly. Where provenance of a development-only reference image could not be established from the project record, Textify does not invent an attribution.

For the exact production transformation pipeline, see `PROCESS.md`. For bundled-code/dependency status, see `THIRD_PARTY_NOTICES.md` and `ACKNOWLEDGMENTS.md`.
