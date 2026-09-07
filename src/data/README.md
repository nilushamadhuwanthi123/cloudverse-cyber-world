# `data/`

Mock content as plain JS/JSON objects — threat definitions, mission
definitions, district metadata.

This is *content*, not logic. Keeping it separate is what makes the
"API-ready" claim in the README honest: when a backend exists, only
`services/` changes to fetch this instead of importing it.
