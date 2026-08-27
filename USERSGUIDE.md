# Textify User Guide

**Version 4.47.1**

## 1. Select an image

Open a webpage and click the Textify toolbar icon. Textify overlays eligible images with a selectable target. Click the image you want to transform.

Eligible images must be at least 100 × 100 pixels. If the source image is larger than 1000 pixels on its longest side, Textify scales it down before processing. Browser security can prevent capture of some cross-origin images; Textify reports this rather than sending the image elsewhere.

The selected image opens in a new Textify output tab.

## 2. Control layout

The controls are deliberately grouped in the same hierarchy across modes.

### Standard controls

- **Width** — changes the working/output width. In vector modes it changes backing/export size without changing the underlying source-coordinate geometry.
- **Contrast** — changes tonal separation before the transformation algorithm uses luminance.
- **Zoom** — changes preview scale. In Stipple and Single-Line it is display-only and does not regenerate geometry.

### Transformation controls

Each mode's unique controls are grouped together: detail/count/cities first, then style and size, then tone or structure controls.

### Color controls

Foreground, pen/dot, background, palette, and related choices are grouped at the bottom.

### Utility buttons

- **Negative** is the vector-tone reverse used by **Stipple** and **Single-Line/TSP**; it also reverses their selected foreground/background treatment. BW uses its separate **Invert** control. Other non-vector modes retain their own existing tone/color behavior.
- **Transparent PNG** appears in Half-Tone and toggles transparent PNG export.
- **Reset** returns the current mode or selected style to its calibrated release default.

## 3. Modes

### BW

Creates monochrome ASCII art. Font Size, Width, Contrast, and Zoom control the text grid and display. **Invert** flips the BW character-tone mapping. Save as TXT, HTML, or PNG.

### Color ASCII

Uses the same character-density logic as BW but colors each character from the corresponding image sample.

### Color Block

Uses full block characters colored from the source image. This emphasizes image color rather than character shape.

### Half-Tone

Creates circular dots in a regular cell field. Controls include:

- Halftone Size
- Color Improvement
- Improvement Level
- Overall Style
- Halftone Color palette or source-image colors
- Background Color
- Transparent PNG

### Glitch

Builds red/cyan horizontal bar patterns. Spacer Rows adds separation between rows.

### Custom

Builds colored rectangular blocks. Controls include Row Density, Col Density, H Gap, Orientation, Spacer Rows, Block Colors, and Background. Coarse/Medium/Fine presets are available for row and column density.

## 4. Stipple

Choose one of four styles.

| Style | Release reset |
|---|---|
| Classic / Adaptive | 16,000 dots; dot size 0.7; contrast 1.4; width 100%; zoom 100%; Relaxation 50 |
| Blue Noise / Poisson | 23,500 dots; dot size 0.8; contrast 0.7; width 100%; zoom 35%; Spacing 27 |
| Dithered / Bayer | 16,000 dots; dot size 0.7; contrast 1.2; width 100%; zoom 100%; Tone Contrast 50 |
| Structure / Contour | 16,000 dots; dot size 0.7; contrast 1.5; width 100%; zoom 100%; Structure Emphasis 50 |

Blue Noise has an extended count range up to 40,000 so the calibrated 23,500-dot default still leaves useful headroom.

Dot Size changes appearance, not the point placement itself.

## 5. Single-Line / TSP

Each style first creates image-dependent cities, then routes one continuous open path through them.

| Style | Release reset |
|---|---|
| Classic / Marilyn | 22,006 cities; line 0.45; contrast 0.8; zoom 40%; Tone Support 100; Feature Detail 100 |
| Voronoi / Organic | 11,225 cities; line 0.95; contrast 3.0; zoom 40%; Tone Contrast 100; Smoothness 100 |
| Dithered / Maze | 11,000 cities; line 1.0; contrast 1.3; zoom 100%; Tone Contrast 50; Pattern Strength 50 |
| Textured / Directional | 12,000 cities; line 1.20; contrast 1.4; zoom 30%; Direction Strength 65; Texture Scale 50 |

Classic city count extends to 40,000. Classic Tone Support/Feature Detail and Voronoi Tone Contrast/Smoothness extend to 160; the calibrated value 100 remains the release default.

Line Width changes the stroke appearance and does not participate in city placement or TSP routing.

## 6. Reset behavior

Reset keeps the currently selected Stipple or Single-Line style and restores that style's calibrated values, including style-specific Contrast and Zoom. Vector geometry caches are cleared so Reset gives a reproducible baseline.

For the non-vector modes, Reset restores that mode's standard settings.

## 7. Saving

- **Copy**: copies BW text or the current HTML markup. Use PNG/HTML for Stipple and Single-Line artwork.
- **Save .txt**: BW only.
- **Save .html**: saves a self-contained output page. Stipple and Single-Line are embedded as PNG data.
- **Save .png**: saves the current visual output as an image.

## 8. Performance

Stipple and especially TSP modes can be computationally heavier than text modes because they generate thousands of points and optimize geometry. High city/dot counts can take longer. The release defaults are calibrated for the accepted output; raise counts deliberately.
## 9. Further reading: algorithms and influences

Users interested in how the artwork is generated can read `PROCESS.md` for the exact release pipeline and `REFERENCES_AND_INFLUENCES.md` for the research lineage, public implementation references, artistic influences, development reference images, and the design decisions behind the four Stipple and four Single-Line styles.

