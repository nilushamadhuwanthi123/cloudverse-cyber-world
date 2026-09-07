# `services/`

The seam between the app and where data comes from.

Today these functions read from `data/` and `storage/`. Later they can
call a REST API instead, and — as long as they keep returning the same
shapes — no component has to change. That is the whole point of the
layer, and the reason not to import `data/` directly from a component.
