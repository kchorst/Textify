# Privacy

Textify 4.47.1 processes selected images locally in the browser.

## Data handling

- Textify does **not** send image data to a server.
- Textify contains no analytics, advertising, tracking, telemetry, remote API calls, `fetch`, XHR, WebSocket, or beacon code.
- When the user selects an image, the captured PNG data is temporarily placed in `chrome.storage.local` as `textify_payload` so the extension output tab can read it.
- The output tab removes `textify_payload` immediately after reading it.
- User control settings are stored in `chrome.storage.local` so they can persist between uses.

## Permissions

- `activeTab`: grants temporary access to the page after the user clicks the Textify toolbar button.
- `scripting`: injects the image-selection overlay into that active page.
- `storage`: transfers the selected image payload between extension contexts and stores user settings.

Textify does not request broad host permissions in the manifest.

## Browser security

Some cross-origin images cannot be read into a canvas because of browser security rules. Textify detects this and stops processing that image rather than bypassing the restriction or transmitting the image elsewhere.
