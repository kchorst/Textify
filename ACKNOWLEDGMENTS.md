# Acknowledgments

Textify's Stipple and Single-Line/TSP modes stand on a long tradition of computational illustration and optimization art. We especially acknowledge **Adrian Secord** for weighted Voronoi stippling; **Robert Bosch** and **Adrianne Herman** for continuous-line drawings via the Traveling Salesman Problem; and **Craig S. Kaplan** and **Robert Bosch** for the broader TSP Art work on alternative city distributions and rendering styles.

**Bryce Bayer's** ordered-dithering work is part of the lineage behind the Dithered/Bayer and Dithered/Maze styles.

The public `traveling-salesman-art` project and explanatory article by **Jack Morris (`jxmorris12`)** were evaluated during development as a practical reference for weighted Voronoi stippling and approximate TSP art. Textify does not bundle that project as a runtime dependency and does not present its source as Textify code.

Development also relied on user-supplied visual reference/regression images, notably a Marilyn Monroe TSP-art reference and the Audrey and Rai portraits. Those images were used to judge density, spacing, facial fidelity, background behavior, and local-line character; they are not bundled in the release.

For a detailed account of what was learned from each reference, what Textify implements independently, and how the release differs from classical formulations, see `REFERENCES_AND_INFLUENCES.md`.
