# Agent guide

## Project overview

Comlink is an Electron desktop interface for Sage business workflows. The React UI
manages sales documents, articles, customers, suppliers, stock, payment schedules,
PDF printing, and WhatsApp document sharing. User-facing text is primarily French.
The business API is external; this repository contains the desktop client, not
the backend implementation.

## Stack and entry points

- Electron with `electron-vite` and `electron-builder`.
- React 19, React Router hash routing, Ant Design, and Tailwind CSS 4.
- JavaScript/JSX; Electron source generally uses CommonJS and renderer source uses
  ES module imports. Vite and ESLint configuration files use `.mjs`.
- `electron.vite.config.mjs` defines separate main, preload, and renderer builds.
  The renderer alias `@renderer` resolves to `ui/`.

## Code map

| Path                              | Responsibility                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `electron/main.js`                | Application lifecycle, tray, windows, authentication IPC, printing and sharing handlers |
| `electron/preload.js`             | Explicit `window.api` bridge between renderer and Electron                              |
| `electron/session.js`             | Session persistence in the Electron user-data directory                                 |
| `electron/config.js`              | App identity, tray icon path, and `API_ORIGIN` configuration                            |
| `electron/windows/`               | Login and detail window creation                                                        |
| `electron/services/`              | PDF downloads, printing, WhatsApp, and native menus                                     |
| `ui/main.jsx`, `ui/App.jsx`       | Renderer startup and application composition                                            |
| `ui/routes.jsx`                   | Hash routes, layouts, document editor and detail views                                  |
| `ui/pages/Home.jsx`               | Document listing, filters, polling, selection, and document actions                     |
| `ui/pages/create-document.jsx`    | Document editor orchestration, loading, line selection, and stock workflows             |
| `ui/components/`                  | Business forms, tables, document actions, and dialogs                                   |
| `ui/components/Client/`           | Customer form tabs and shared customer form primitives                                  |
| `ui/components/EcheancierTab.jsx` | Payment schedule editing, response normalization, and validation                        |
| `ui/components/ui/`               | Reusable desktop windows, confirmation and context menus                                |
| `ui/hooks/`                       | Line-item state and stock-unavailability queue                                          |
| `ui/api/`                         | Article, customer, and document transformation API helpers                              |
| `ui/utils/api.jsx`                | Shared Axios client, bearer authentication, and company header                          |
| `ui/contexts/AuthContext.jsx`     | Renderer authentication, roles, and permissions                                         |
| `ui/constants/`                   | Document types, statuses, field labels, and transformation constants                    |
| `ui/utils/`                       | Date, API, and other shared helpers                                                     |
| `ui/assets/`                      | Global CSS and renderer assets                                                          |
| `build/`, `resources/`            | Packaging resources; `build/` is not disposable build output                            |
| `electron-builder.yml`            | Installer, platform packaging, and release configuration                                |

## Development commands

Use npm and retain `package-lock.json` as the dependency lockfile.

| Command                                     | Purpose                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm install`                               | Install dependencies; postinstall installs Electron app dependencies           |
| `npm run dev`                               | Start the Electron development application                                     |
| `npm start`                                 | Preview built application output                                               |
| `npm run lint`                              | Run ESLint with caching                                                        |
| `npm run build`                             | Build main, preload, and renderer bundles                                      |
| `npm run build:unpack`                      | Build an unpacked desktop application                                          |
| `npm run build:win`                         | Build the Windows installer                                                    |
| `npm run build:mac` / `npm run build:linux` | Build platform packages; platform tooling may be required                      |
| `npm run format`                            | Rewrite formatting across the repository; prefer formatting only changed files |

`npm run publish` builds and publishes a Windows release to GitHub. Run it only
when the task explicitly calls for publishing a release.

## API and Electron boundaries

- Use the shared `api` instance from `ui/utils/api.jsx` for business requests.
  It reads the API base URL from local storage key `connection_url`, defaulting to
  `https://localhost:7244`. The base URL is captured when the module loads.
- Its request interceptor reads `authToken` and `company` from local storage and
  sets bearer authorization and `X-Company`. The default company is `intercocina`.
  Preserve company scoping when adding or changing requests.
- Inspect existing callers before changing endpoint paths, payload shapes, field
  casing, or success/error handling. Some components normalize backend response
  variants; preserve that compatibility unless the contract changes explicitly.
- Keep privileged OS and filesystem operations in Electron. Add narrowly scoped
  preload methods and matching IPC handlers when a renderer needs native behavior.
  Preserve context isolation and disabled renderer Node integration.
- Preserve PDF URL validation, token-origin handling, printer validation, and
  temporary-file cleanup in the native services.
- Authentication spans renderer local storage, `AuthContext`, the preload bridge,
  and Electron session persistence. Check all involved paths for auth changes;
  existing code uses both `token` and `access_token` in different places.
- Do not commit credentials, session files, or customer data, or log bearer tokens.
- Product image previews use a separate Intercocina API through the preload
  `getProductImages` method. Set `PRODUCT_IMAGES_API_KEY` in the application
  environment, or use the ignored root `product-images.local.json` file with an
  `apiKey` property for local development. The local file is excluded from
  installers. Never put this key in renderer code or the shared Sage API client.
  Run `node --test tests/productImages.test.cjs` for image request regression checks.

## Business and UI conventions

- Reuse existing Ant Design controls, desktop-window patterns, and French labels.
  Preserve accents and UTF-8 encoding.
- Use `ui/constants/documentTypes.js` and `ui/constants/transform.js` for document
  mappings. Numeric values, API type names, statuses, and piece numbers are
  business identifiers; do not casually rename or renumber them.
- A document's `piece` and its document type jointly identify document operations.
  Preserve route/query context when navigating, transforming, or refreshing.
- `useLineItems` assigns server rows position-based keys and temporary keys to
  local additions. Preserve those semantics and selection behavior on refetch.
- Preserve protection against stale async responses, polling cleanup, and local
  removal tracking when changing document loading or transformation workflows.
- For payment and totals changes, distinguish editable amounts from backend
  calculated amounts, missing values from zero, and display formatting from API
  serialization. Reuse the relevant date helpers and existing payload conventions.
- Keep loading, empty, validation, and failure states usable. Surface backend
  errors using the surrounding component's established pattern.

## Editing and verification

- Read the relevant component and its callers before editing. Keep changes scoped
  to the task and preserve unrelated work already in the working tree.
- Follow `.editorconfig` and `.prettierrc.yaml`: two spaces, LF, UTF-8, single
  quotes, no semicolons, no trailing commas, and a 100-character print width.
- Do not edit generated `out/`, `dist/`, dependency contents in `node_modules/`, or
  `.eslintcache`. Change source files and build configuration instead.
- There is no configured automated test script. For code changes, run ESLint on
  touched JS/JSX files and `npm run build` when appropriate. Report existing
  failures separately from failures introduced by the change.
- Window lifecycle regression tests use Node's built-in test runner:
  `node --test tests/showWindow.test.cjs`. Detail windows and their minimized bars
  have independent state in `electron/windows/showWindow.js`; opening or closing
  one detail window must preserve the others.
- Exercise affected UI workflows when an Electron session and API are available.
  Native printing, WhatsApp, authentication, and business operations require
  their actual services or environment; a successful build does not verify them.
- Documentation-only edits need formatting and content checks, not an app build.
- In the handoff, state what changed, what was checked, and any verification that
  could not be completed. Update this guide when architecture or commands change.
