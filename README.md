# bikg_app
[![build](https://github.com/datavisyn/bikg_app/actions/workflows/build.yml/badge.svg)](https://github.com/datavisyn/bikg_app/actions/workflows/build.yml)

App template for full-stack datavisyn apps. The repository is split into frontend (`src`, `package.json`, ...) and backend (`bikg_app`, `Makefile`, `requirements.txt`, ...). Make sure you have Node 16 and the latest yarn version installed (and run `corepack enable`).

To get started, clone this repository:

```bash
git clone -b develop https://github.com/datavisyn/bikg_app.git  # or any other branch you want to develop in
cd bikg_app
```

Finally, replace all occurances of `bikg_app` with your new application name (i.e. also the folder `bikg_app`). Then delete the `.git` folder and initialize with a new repository.

## Frontend

The frontend is a React application built and managed via [visyn_scripts](https://github.com/datavisyn/visyn_scripts). All relevant scripts can be found in the package.json.

### Installation

yarn 3 is used as package manager, such that you can simply install the frontend via `yarn install`.

### Development

The application has many package.json scripts available, with one of them being `yarn start`. This will start the webpack dev-server.

### Linting

All sourcefiles are linted via ESLint and Prettier, which can be checked and auto-fixed via `yarn run lint[:fix]`.

### Testing

Jest is used for unit-tests via `yarn run test`, and Cypress is used for e2e and component tests via `yarn run cy:run`. Alternatively, the Cypress UI can be started via `yarn run cy:open`.

### Building

For generating a production build of the application (i.e. for deployment to Github Pages), simply run `yarn run webpack:prod` and the bundle will be in the `bundles/` folder.

**Note:** The CI will automatically run the lint, build and test jobs, such that it makes sense to run them before committing. `yarn run all` runs all the relevant tasks.

## Backend

The backend is a FastAPI server managed via [visyn_core](https://github.com/datavisyn/visyn_core). All relevant scripts can be found in the Makefile.

### Installation

It is recommended to create a virtual environment to avoid cluttering the global installation directory.

```bash
python -m venv .venv  # create a new virtual environment
source .venv/bin/activate  # active it
make develop  # install all dependencies
```

### Development

To start the development server, simply run `python bikg_app` which will execute a uvicorn runner.

### Linting

All sourcefiles are formatted and linted, which can be checked and auto-fixed via `make format` and `make lint`.

### Testing

pytest is used for unit-tests via `make test`. See `bikg_app/tests` for details.

**Note:** The CI will automatically run the lint, build and test jobs, such that it makes sense to run them before committing. `make all` runs all the relevant tasks.
