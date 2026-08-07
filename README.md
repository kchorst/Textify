# Textify

Textify is a browser extension that allows you to convert images from any webpage into ASCII art directly in your browser.

## Latest Update: Custom Mode
**NEW:** Added Custom mode - a fully customizable slit vision rendering mode with comprehensive control over all rendering parameters while preserving original image dimensions.

**Credit:** The slit vision effect in Custom mode is inspired by the visual illusion research of **Professor Akiyoshi Kitaoka** from Ritsumeikan University, Osaka, Japan. His pioneering work on visual perception and optical illusions has inspired countless artists and researchers. Learn more at: https://www.ritsumei.ac.jp/~akitaoka/index-e.html

**Custom Mode Features:**
- **Color Selection:** Choose multiple block colors (Red, Cyan, Blue, Yellow, Black, White) that cycle through the rendering
- **Background Color:** Select any of 6 preset colors for the background
- **Density Control:** Adjust row and column density with Coarse/Medium/Fine presets for fine-grained control
- **Gap Control:** Set horizontal and vertical gaps between blocks/rows
- **Orientation:** Toggle between horizontal (variable height blocks) and vertical (variable width blocks) slit patterns
- **Zoom:** Scale the rendered output (10-100%)
- **Preserves Dimensions:** All rendering maintains the original image's width and height

**Custom Mode Tips:**
- **Best Subjects:** Portraits and detailed images work well with custom mode
- **Color Combinations:** Try Red/Cyan for classic slit vision, or Blue/Yellow for high contrast
- **Density:** Start with Medium density (50/60) and adjust based on image complexity
- **Gaps:** Use horizontal gaps to separate blocks, spacer rows for vertical spacing
- **Orientation:** Horizontal is traditional slit vision; vertical creates a different aesthetic

## License: Non-Commercial Use Only

This repository contains source-available code and utilities strictly governed by the **PolyForm Noncommercial License 1.0.0**.

* **Allowed:** Free for personal experimentation, individual learning, testing, and academic research.
* **Prohibited:** Commercial use, corporate deployment, resale, or monetization of this software in a business environment is strictly forbidden.

For the full binding legal text, please see the accompanying [LICENSE.md](LICENSE.md) file.

## Features
* **Multiple Rendering Modes:**
    * **BW:** Traditional black and white ASCII art.
    * **Color ASCII:** Colored characters based on the source image pixels.
    * **Color Block:** A block-based representation that retains image color and density.
    * **Glitch:** Red/cyan block-based rendering with variable heights and alternating colors for a glitched aesthetic.
    * **Custom:** Fully customizable slit vision mode with color selection, density control, gaps, and orientation toggle.
* **Customization:** Adjust font size, width, contrast, and toggle between light/dark backgrounds. Glitch and Custom modes include zoom control. Custom mode includes comprehensive parameter control.
* **Export Options:** * Copy the result to your clipboard.
    * Save as a `.txt` file (BW mode only).
    * Save as a standalone `.html` file (all modes).
    * Save as a `.png` image (all modes).

## Usage
1. Click the **Textify icon** in your browser toolbar to activate the extension on the current page.
2. Hover over any image on the page to see the `[ TEXTIFY ]` overlay.
3. Click the overlay to open the rendering dashboard.
4. Use the controls in the dashboard to refine the ASCII output to your liking.
5. Use the buttons at the bottom to copy or save your creation.

## Limitations
* **CORS Restrictions:** Images that do not have appropriate Cross-Origin Resource Sharing (CORS) headers cannot be processed, as the browser prevents reading pixel data from them.
* **Minimum Size:** Images smaller than 100x100 pixels will not be processed to ensure quality.
* **Large Images:** Images with a dimension exceeding 1000px will be automatically scaled down before processing to maintain performance.

## Technical Details
* **Manifest V3:** Built using the latest Chrome extension standards.
* **Rendering:** Uses HTML5 Canvas for pixel data extraction and custom algorithms for luminance and color-to-character mapping.
