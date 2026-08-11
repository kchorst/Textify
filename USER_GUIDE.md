# Textify User Guide

## Installation

1. Download or clone the Textify repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the Textify folder
5. The Textify extension is now installed and ready to use

## Basic Usage

1. Navigate to any webpage with images
2. Click the **Textify icon** in your browser toolbar
3. Hover over any image to see the `[ TEXTIFY ]` overlay
4. Click the overlay to open the rendering dashboard
5. Use the controls to adjust the output
6. Copy or save your creation using the buttons at the bottom

## Rendering Modes

### BW (Black & White)
Traditional ASCII art using characters to represent brightness levels.

**Controls:**
- Font Size: 8-24px
- Width: 10-100% of container
- Contrast: 0.5-3.0
- Invert: Toggle brightness mapping
- Background: Toggle black/white background

**Best For:** All images, text-heavy content, simple graphics

### Color ASCII
Colored characters based on the source image pixels.

**Controls:** Same as BW mode, plus color preservation

**Best For:** Colorful images, screenshots, artwork

### Color Block
Block-based representation that retains image color and density.

**Controls:** Same as BW mode

**Best For:** High-detail images, photos with rich color

### Glitch
Red/cyan block-based rendering with variable heights and alternating colors.

**Controls:**
- All BW controls
- Spacer Rows: 0-5 (vertical spacing between colored rows)
- Zoom: 10-100%

**Best For:** Portraits, close-ups, high-contrast compositions

**Tips:**
- Use Spacer Rows to create breathing room between color bands
- Higher contrast values create more dramatic glitch effects
- Works best with face-only shots and minimal backgrounds

### Half-Tone (NEW)
Traditional halftone dot pattern rendering with advanced color processing and image color support.

**Credit:** The halftone effect in Half-Tone mode is inspired by the online halftone image generator at **Picture to People** (https://www.picturetopeople.org/image_effects/photo-halftone/halftone-image-generator.html). This tool provides advanced halftone photo effects with customizable parameters for artistic image transformation.

**Controls:**
- **Color Improvement:** 9 processing options
  - None: No color processing
  - Strong: Boosts all RGB values by 1.5x
  - Privilege bright: Enhances bright areas
  - Privilege dark: Enhances dark areas
  - Smart: Enhances above-average brightness pixels
  - Smart channels: Enhances dominant RGB channel
  - Hot colors: Strongly boosts red-dominant pixels
  - Smart hot: Boosts very bright red-dominant pixels
  - Pastel: Softens colors toward white
- **Improvement Level:** 1-10 (intensity multiplier for color processing)
- **Overall Style:** Bright/Dark (global brightness adjustment)
- **Halftone Size:** 12 options (Micro/Nano/Tiny/Very small/Small/Average/Big/Very big/Huge/Massive/Giant/Colossal)
- **Color Options:**
  - Use image colors: Check to use actual RGB colors from your image
  - Preset colors: Red, Cyan, Blue, Yellow, Black, White (multi-select)
  - Color picker: Custom color selection
- **Background Color:** Preset colors or color picker
- **Transparent PNG:** Export as transparent PNG file
- **Zoom:** 10-100%

**Best For:** Colorful photographs, artistic halftone effects, retro printing aesthetics

**Tips:**
- **Use Image Colors:** Check "Use image colors" to use actual image colors for dramatic effects
- **Color Improvement:**
  - Try "Strong" or "Hot colors" with colorful images for dramatic effects
  - "Pastel" creates soft, muted halftone patterns
  - "Smart channels" enhances the dominant color in each area
- **Improvement Level:**
  - 1-3: Subtle color enhancement
  - 4-7: Moderate color processing
  - 8-10: Intense color transformation
- **Size Control:**
  - Micro/Nano: Fine detail, almost continuous tone
  - Small/Average: Classic halftone look
  - Huge/Colossal: Bold, artistic dot patterns
- **Background:**
  - Use contrasting background for better visibility
  - White background with dark dots for traditional look
  - Black background with bright dots for inverted effect
- **Transparent PNG:** Enable for halftone overlays without background

### Custom (NEW)
Fully customizable slit vision mode with comprehensive parameter control.

**Credit:** The slit vision effect in Custom mode is inspired by the visual illusion research of **Professor Akiyoshi Kitaoka** from Ritsumeikan University, Osaka, Japan. His pioneering work on visual perception and optical illusions has inspired countless artists and researchers. Learn more at: https://www.ritsumei.ac.jp/~akitaoka/index-e.html

**Controls:**
- **Block Colors:** Select multiple colors (Red, Cyan, Blue, Yellow, Black, White) that cycle through blocks
- **Background:** Choose single background color from 6 presets
- **Row Density:** 10-100 with Coarse(20)/Medium(50)/Fine(80) presets
- **Col Density:** 10-100 with Coarse(30)/Medium(60)/Fine(90) presets
- **H Gap:** 0-10 (horizontal spacing between blocks)
- **Spacer Rows:** 0-5 (vertical spacing between rows)
- **Orientation:** Horizontal (variable height) or Vertical (variable width)
- **Zoom:** 10-100%

**Best For:** Portraits, artistic effects, custom color schemes

**Tips:**
- **Color Combinations:**
  - Red/Cyan: Classic slit vision (like Mona Lisa example)
  - Blue/Yellow: High contrast, modern look
  - Black/White: Monochrome slit vision
  - Multi-color: Cycle through 3+ colors for artistic effects
- **Density:**
  - Start with Medium (50/60) for most images
  - Use Coarse for simpler images or faster rendering
  - Use Fine for detailed images or higher resolution
- **Gaps:**
  - H Gap creates horizontal spacing between blocks
  - Spacer Rows creates vertical spacing between rows
  - Use both for a grid-like effect
- **Orientation:**
  - Horizontal: Traditional slit vision (variable height blocks)
  - Vertical: Creates vertical striping effect (variable width blocks)

## Export Options

### Copy
Copies the rendered output to your clipboard.

- **BW Mode:** Copies plain text
- **Other Modes:** Copies HTML with formatting

### Save .txt
Saves as a plain text file (BW mode only).

### Save .html
Saves as a standalone HTML file with embedded CSS.

- **Note:** The saved HTML is self-contained and can be opened in any browser
- **Custom Mode:** Includes all custom styling and parameters

### Save .png
Saves as a PNG image.

- **Note:** PNG export preserves the exact rendered output including colors and dimensions
- **Custom Mode:** Exports with custom colors, gaps, and orientation
- **Half-Tone Mode:** Option to export as transparent PNG (when enabled, background color is ignored)

## Settings Persistence

Textify automatically saves your settings:

- **Per Mode:** Each mode remembers its own settings
- **Reset:** The Reset button only resets the current mode's settings
- **Storage:** Settings are saved in Chrome's local storage

## Troubleshooting

### Extension Not Working
- Ensure Developer Mode is enabled in `chrome://extensions/`
- Try reloading the extension
- Check the extension has proper permissions

### Images Not Processing
- **CORS Error:** The image doesn't have proper CORS headers. Try a different image or download it locally.
- **Too Small:** Images under 100x100 pixels are skipped
- **Too Large:** Images over 1000px are automatically scaled down

### Output Looks Wrong
- **Low Contrast:** Increase the Contrast slider
- **Wrong Orientation:** Try the Invert button
- **Poor Quality:** Increase density or adjust gap settings
- **Colors Off:** Check background color selection

### Performance Issues
- **Slow Rendering:** Reduce density settings
- **Browser Crash:** The image may be too large; try a smaller image
- **Laggy Controls:** Reduce density or use Coarse presets

## Advanced Tips

### Creating Slit Vision Effects
1. Start with a portrait image
2. Switch to Custom mode
3. Select Red and Cyan block colors
4. Set background to Black
5. Use Medium density (50/60)
6. Set H Gap to 0, Spacer Rows to 1-2
7. Adjust density until faces are recognizable
8. Export as PNG for best quality

### Color Customization
- Use complementary colors (Red/Cyan, Blue/Yellow)
- Avoid using the same color for blocks and background
- Try Black background with bright block colors for high contrast
- White background with dark block colors for inverted look

### Density Tuning
- **Coarse:** Faster rendering, blockier look
- **Medium:** Balanced quality and performance
- **Fine:** Highest detail, slower rendering

### Gap Experimentation
- **No Gaps:** Creates solid striping effect
- **Small Gaps (1-3):** Subtle separation between elements
- **Large Gaps (5-10):** Creates grid/pixelated effect
- **Combine H Gap + Spacer Rows:** Creates a matrix/grid pattern

## Limitations

- **CORS:** Images without proper headers cannot be processed
- **Minimum Size:** 100x100 pixels required
- **Maximum Size:** 1000px dimension limit (auto-scaled)
- **Browser Compatibility:** Chrome/Chromium-based browsers only

## License

Textify is governed by the PolyForm Noncommercial License 1.0.0.

- **Allowed:** Personal use, learning, testing, academic research
- **Prohibited:** Commercial use, corporate deployment, resale, monetization

See [LICENSE.md](LICENSE.md) for full details.
