# `features/`

One folder per district. Each owns its own components, state and logic.

- `cyber/`   — Nilusha: threat monitor, firewall, incident response
- `cloud/`   — teammate: compute, storage, database
- `devops/`  — teammate: CI/CD pipeline
- `core/`    — shared: world health, the central Core visualisation

Two people work in this repo at once. Districts are separate folders so
that two feature branches touch different files and merge cleanly —
the shared seam is `game/` and `core/`, and changes there are worth a
conversation in the PR.
