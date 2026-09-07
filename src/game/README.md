# `game/`

Application logic layer — the rules of CLOUDVERSE, in plain JavaScript.

World health, security score, mission state, risk scoring, unlock order.
No JSX, no DOM, no `localStorage` calls here: this layer should be
readable (and testable) without a browser.

Both districts feed events into this layer, and the Core reads out of it.
