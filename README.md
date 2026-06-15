# Textify

Textify is a browser extension that allows you to convert images from any webpage into ASCII art directly in your browser.

## Features
* **Multiple Rendering Modes:**
    * **BW:** Traditional black and white ASCII art.
    * **Color ASCII:** Colored characters based on the source image pixels.
    * **Color Block:** A block-based representation that retains image color and density.
* **Customization:** Adjust font size, width, contrast, and toggle between light/dark backgrounds.
* **Export Options:** * Copy the result to your clipboard.
    * Save as a `.txt` file (BW mode only).
    * Save as a standalone `.html` file.
    * Save as a `.png` image.

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
