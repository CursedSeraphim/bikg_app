# Developer Notes

This repository contains a full-stack application with a TypeScript/React frontend and a Python/FastAPI backend. The directory layout is roughly split into two major parts:

- `src/` – React app.
- `bikg_app/` – FastAPI backend.

Below is a short overview of the main features and their relevant files. This should help new contributors (or AI assistants) navigate the project quickly.

## Frontend

- **Entry Points**
  - `src/App.tsx` – Main application component. It dispatches fetch actions from `src/api.tsx` and renders the main views.
  - `src/index.initialize.tsx` – Webpack entry for the visyn_scripts build system.

- **API helpers** – `src/api.tsx` contains wrapper functions for all REST endpoints exposed by the backend (e.g. `/api/bikg/file/study`, `/api/bikg/plot/bar`).

- **Redux State**
  - `src/components/Store` – Redux store setup.
    - `Store.ts` – configures the store.
    - `CombinedSlice.ts` – large slice holding most application state and reducers.
    - `thunks.ts` – asynchronous thunks to fetch initial data (CSV, violations, etc.).

- **Views / Features**
  - `src/components/Cytoscape` – graph view built with Cytoscape.
  - `src/components/LineUp` – table visualization using lineupjs.
  - `src/components/Treeview` – ontology tree explorer.
  - `src/components/FeatureDistributionView` – bar plots of feature distributions.
  - `src/components/EmbeddingView` – scatter plot of embeddings.
  - `src/components/LangChain` – chat interface using the LangChain library.
  - `src/useCytoCumulativeCounts.ts` – helper to update Cytoscape node labels based on Redux counts.

- **Styling & Constants**
  - `src/constants.ts` – color and layout constants.
  - `src/styles.css` – global styles.

Tests for the frontend live in `tests/` (Jest) and `cypress/` (Cypress).

## Backend

- **Application Entrypoints**
  - `bikg_app/dev_app.py` and `bikg_app/__main__.py` start the FastAPI app using visyn_core.

- **API Routes** – `bikg_app/routers/routes.py` exposes endpoints under `/api/bikg/...` used by the frontend. These include
  - file access (`/file/study`, `/file/ontology`, ...),
  - data views like `/plot/bar`, `/sub-class-of`, etc.
- **Helper functions** – `bikg_app/routers/utils.py` provides functions for serializing dicts, processing graphs, and more.
- **Preprocessing** – `bikg_app/preprocess.py` transforms raw TTL files into CSV/JSON assets stored in `bikg_app/csv`, `bikg_app/json`, and `bikg_app/ttl`.
- **Tests** – Python tests live in `bikg_app/tests/`.

## Development

- Frontend commands are available via `yarn` (see `package.json`). Useful scripts:
  - `yarn start` – start webpack dev server.
  - `yarn run lint` / `yarn run lint:fix` – lint sources.
  - `yarn run test` – run Jest tests.

- Backend helper commands are defined in the `Makefile`:
  - `make start` – run the dev server.
  - `make format` / `make lint` – format and lint Python code.
  - `make test` – run pytest.

Running both linting and test tasks before committing is recommended (`yarn run all` for the frontend, `make all` for the backend).
