---
name: screenshot_photo_analysis
description: Read screenshots, photos, scans, dashboard images, charts, UI mockups, and other visual attachments.
---

# Screenshot and Photo Analysis

Use this skill when the user attaches or references a screenshot, photo, scan, chart image, dashboard image, UI mockup, error image, receipt, whiteboard, or any other visual material.

## Workflow

1. Identify the image type and user intent:
   - Screenshot or UI: describe the screen, visible state, key controls, labels, error messages, and likely user workflow.
   - Chart or dashboard: extract title, axes, legends, visible values, trends, outliers, and business meaning.
   - Document scan or receipt: transcribe visible text and preserve headings, dates, amounts, names, and line items.
   - Photo: describe relevant objects, layout, visible text, condition, counts, and anything material to the request.

2. Separate direct observation from inference:
   - Label visible facts as observations.
   - Label uncertain readings as uncertain.
   - Do not invent text, numbers, UI labels, or hidden context.

3. If the image contains text:
   - Extract the text in reading order where possible.
   - Preserve numbers and currency exactly as seen.
   - Mention any text that is cropped, blurry, too small, or partially obscured.

4. If the image contains a business artifact:
   - Translate the visual into decision-ready notes.
   - Highlight risks, anomalies, missing information, and suggested next actions.

5. If the user asks for a specific output format:
   - Return that format directly, such as a table, checklist, issue list, summary, or report section.

## Quality Rules

- Never claim certainty for unclear pixels or unreadable text.
- Do not infer private or sensitive personal attributes from a person in a photo.
- For charts and screenshots, prioritize exact labels and numbers visible in the image over generic commentary.
- For UI screenshots, include likely usability issues only when they are visible or directly supported by the screenshot.
