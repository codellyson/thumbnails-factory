# The quality bar for templates

A template is judged as a thumbnail, not as a layout. Correctness - safe areas,
the timestamp corner, alignment - is necessary and already checked elsewhere.
This bar is about whether the result would stop someone scrolling.

It was drawn from thumbnails that work, not from our own mockups. The reference
for Before → After is a fitness transformation thumbnail: two big circular photos
on a textured red field, a white slash between them, a curved dashed arrow, small
BEFORE / AFTER labels, and one heavy condensed headline across the bottom with a
single accent word.

Every template is reviewed at full size **and** at 168 px wide (YouTube's
suggested list, the Feed preview) next to its reference. If it loses there, it
loses.

## The bar

Each rule has a number so it can be measured, not argued. `H` is the frame's
height; areas are fractions of the frame.

| # | Rule | Measure | Pass |
|---|---|---|---|
| 1 | **The headline is loud.** Few words, a heavy condensed face, one accent. | Capital height of the headline ÷ H | Pass ≥ 0.09 wide, ≥ 0.06 tall. Aim for 0.12 with three words or fewer |
| 2 | **The subject dominates.** Pictures, not frames around them, carry the image. | Area of the picture shapes ÷ frame | ≥ 0.33 |
| 3 | **No dead zones.** The frame is filled edge to edge with something doing work. | Split the frame into a 4 × 4 grid; a cell is dead when its brightness barely varies (standard deviation < 6 on 0–255) | ≤ 2 dead cells of 16 |
| 4 | **The background has depth.** Texture, light or a picture - never one flat colour. | Covered by rule 3: a flat background fails it | - |
| 5 | **One story, with a device that directs the eye.** An arrow, a slash, a split - something that says "look here, then there". | Present in the design | Yes |
| 6 | **It reads at 168 px.** | Capital height at 168 px wide | ≥ 8 px on a 16:9 frame, which rule 1's pass line guarantees; 11 px at the 0.12 aim |
| 7 | **It looks finished with nothing dropped in.** Stand-ins are painted to look like content, not like wireframes. | The default render, no pictures loaded, passes rules 1–3 | Yes |
| 8 | **Correctness still holds.** Safe areas, the timestamp corner, every size. | Existing checks | All 12 sizes |

The pass line for rule 1 comes from the reference itself: its four-word headline
measures 0.084, so a template has to beat that with the same words. A headline
that measures under the line is the signal to cut words, not to shrink them.

## How it is checked

On a local server (`localhost`), the page exposes `window.TF.quality()`, which
renders the current template at the current size and returns the numbers for
rules 1–3 alongside pass or fail. `window.TF.qualityAll()` runs it for every
size. The helper is not there when the page is served from anywhere else.

## Templates against the bar

| Template | Status |
|---|---|
| Before → After | Rebuilt to this bar. Passes rules 1–3 at all 12 sizes with nothing dropped in, and with real photos and a short headline. A long accent word ("TRANSFORMATION") still fails rule 1 on 9:16 covers, which is the bar asking for fewer letters |
| Launch | Not yet reviewed against it |
| Showcase | Not yet reviewed against it |
| Full picture | Not yet reviewed against it |
