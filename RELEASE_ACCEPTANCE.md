# Textify 4.47.1 Release Acceptance

## Final decision

**ACCEPTED — SHIP**

Textify 4.47.1 satisfies the release gates for the browser extension state accepted after RC93 qualification.

## Acceptance basis

1. **Artistic/user gate** — the final Stipple and Single-Line defaults were manually browser-calibrated and qualified through the RC93 test cycle. Development was explicitly stopped at that state.
2. **Render-code freeze** — all render/UI/content files that determine the accepted image output are byte-identical to RC93.
3. **Algorithm gate** — all four Stipple and all four TSP production branches execute successfully in the final VM qualification; release default city-generation counts are exact.
4. **UI/code wiring gate** — IDs, labels, standard control ordering, contextual styles/ranges, and toggle-button state wiring pass static checks.
5. **Extension plumbing gate** — image capture/transfer and Manifest V3 overlay toggling pass isolated unit qualification.
6. **Security/privacy gate** — runtime contains no remote network/analytics code and uses only `activeTab`, `scripting`, and `storage` permissions.
7. **Documentation gate** — required shipping documentation is current and release-scoped.
8. **Package gate** — historical RC/ECO/test debris is excluded from the GitHub-ready package.

## Release-hardening delta from RC93

Only the following release-hardening changes were made after the accepted RC93 UI/render state:

- service-worker-safe overlay toggle logic in `background.js`
- manifest version bump to 4.47.1 and removal of unnecessary `web_accessible_resources`
- repaired license notice and final shipping documentation/package cleanup

No Stipple, Single-Line/TSP, Half-Tone, Custom, ASCII, Color Block, Glitch, control-layout, default, range, or rendering algorithm was changed.

## Shipping instruction

The contents of the `Textify-4.47.1` folder are the GitHub source release. Do not upload the historical RC package or prior engineering-change/QA files.

### Public documentation

Release acceptance includes the dedicated `REFERENCES_AND_INFLUENCES.md` record so the GitHub package documents not only how Textify works, but also the research, public references, visual targets, and independent engineering decisions that shaped the final artwork.

