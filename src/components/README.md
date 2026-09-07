# `components/`

Presentational components shared across districts — `ui/` holds the
primitives (buttons, panels, badges, modal), and anything district-specific
belongs in `features/<district>/` instead.

Rule of thumb: a component lives here once a *second* district needs it.
Moving it here on day one, before that is true, is how a shared folder
fills up with things only one place uses.
