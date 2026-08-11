# Textify

Textify is a browser extension that allows you to convert images from any webpage into ASCII art directly in your browser.

## Latest Update: Half-Tone Mode
**NEW:** Added Half-Tone mode - a traditional halftone dot pattern rendering mode with comprehensive color control and image processing options.

**Credit:** The halftone effect in Half-Tone mode is inspired by the online halftone image generator at **Picture to People** (https://www.picturetopeople.org/image_effects/photo-halftone/halftone-image-generator.html). This tool provides advanced halftone photo effects with customizable parameters for artistic image transformation.

**Half-Tone Mode Features:**
- **Color Improvement:** 9 processing options (None, Strong, Privilege bright/dark, Smart, Smart channels, Hot colors, Smart hot, Pastel) to enhance image colors before dot sizing
- **Improvement Level:** Adjustable intensity (1-10) for color processing effects
- **Overall Style:** Bright/Dark toggle for global brightness adjustment
- **Halftone Size:** 12 size options (Micro to Colossal) for dramatic dot size control
- **Color Options:** Use actual image colors or choose from preset colors (Red, Cyan, Blue, Yellow, Black, White) with color picker support
- **Background Color:** Choose from preset colors or use color picker for custom backgrounds
- **Transparent PNG Export:** Option to export halftone as transparent PNG file
- **Zoom Control:** Scale the rendered output (10-100%)
- **Preserves Aspect Ratio:** Maintains original image proportions in both preview and export

**Half-Tone Mode Tips:**
- **Use Image Colors:** Check "Use image colors" to use the actual RGB colors from your image for the halftone dots
- **Color Improvement:** Try "Strong" or "Hot colors" with colorful images for dramatic effects
- **Improvement Level:** Set to 5-8 for moderate effects, 9-10 for intense color processing
- **Size Control:** Use "Micro" for fine detail, "Colossal" for bold artistic effects
- **Best Subjects:** Colorful photographs work best with image colors enabled
- **Background:** Choose contrasting background color for better visibility

## Previous Update: Custom Mode
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
    * **Half-Tone:** Traditional halftone dot pattern with color improvement, image color support, and customizable dot sizes.
    * **Glitch:** Red/cyan block-based rendering with variable heights and alternating colors for a glitched aesthetic.
    * **Custom:** Fully customizable slit vision mode with color selection, density control, gaps, and orientation toggle.
* **Customization:** Adjust font size, width, contrast, and toggle between light/dark backgrounds. Glitch, Half-Tone, and Custom modes include zoom control. Custom and Half-Tone modes include comprehensive parameter control.
* **Export Options:** * Copy the result to your clipboard.
    * Save as a `.txt` file (BW mode only).
    * Save as a standalone `.html` file (all modes).
    * Save as a `.png` image (all modes, with transparent PNG option for Half-Tone mode).

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
