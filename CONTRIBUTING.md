# Contributing

Changes go through pull requests on <https://github.com/leroyguillaume/resume>. The short version: install the
dependencies and Chromium, run `pre-commit install`, and keep `npm test` and `pre-commit run --all-files` green.

## Development setup

Running the project is covered in [README.md](README.md#getting-started). Contributing additionally needs:

| Tool | Used by | Install |
| --- | --- | --- |
| Node.js ≥ 24 and npm | build, tests, Biome, `tsc` | <https://nodejs.org/en/download> |
| `uv` | installing `pre-commit` | <https://docs.astral.sh/uv/getting-started/installation/> |
| `pre-commit` | the commit gate | `uv tool install pre-commit` |
| `actionlint` | the `actionlint-system` hook | `go install github.com/rhysd/actionlint/cmd/actionlint@v1.7.12`, or a binary from <https://github.com/rhysd/actionlint/releases> |
| `shellcheck` | the `shellcheck` hook, and `actionlint` for `run:` blocks | see below |
| `trivy` (optional) | reproducing the security scan | <https://trivy.dev/latest/getting-started/installation/> |

`shellcheck`:

**macOS**

```sh
brew install shellcheck
```

**Linux**

```sh
sudo apt install -y shellcheck
```

Then, from a fresh clone:

```sh
npm ci
```

```sh
npx playwright install chromium
```

On Linux, add `--with-deps` to that last command so it also installs Chromium's system libraries.

```sh
pre-commit install
```

The setup works when `npm run build` writes `dist/guillaume-leroy-en.pdf` and `dist/guillaume-leroy-fr.pdf`.

## Running the tests

The whole suite, which must pass before a pull request:

```sh
npm test
```

One language, or one test, by title:

```sh
npx playwright test -g "fr résumé"
```

There is a single suite, [tests/cv.spec.ts](tests/cv.spec.ts): end-to-end Playwright tests that open the HTML files
from disk and print them to PDF. It needs the Playwright Chromium and no network. The PDFs printed by a run land in
`test-results/`, which is the quickest way to look at a layout change.

The tests enforce the invariants listed in [ARCHITECTURE.md](ARCHITECTURE.md#invariants-and-constraints). A content
change must update both languages, or the structure test fails. A layout change that introduces a new rule the
existing tests would not catch comes with a test for it.

## Pre-commit hooks

Hooks must pass before a commit is pushed. Run all of them, or a single one while iterating:

```sh
pre-commit run --all-files
```

```sh
pre-commit run biome --all-files
```

| Hook | Checks | Fix |
| --- | --- | --- |
| `trailing-whitespace`, `end-of-file-fixer` | stray whitespace, final newline | fixed in place; stage again |
| `check-yaml` | YAML parses | fix the syntax |
| `check-added-large-files` | no large file is added (`package-lock.json` excepted) | do not commit it |
| `check-merge-conflict` | no conflict markers | resolve the conflict |
| `detect-private-key` | no private key | remove it, and rotate the key |
| `yamllint` | YAML style from [.yamllint.yaml](.yamllint.yaml) | fix what it reports |
| `actionlint-system` | GitHub Actions workflows | fix what it reports |
| `shellcheck` | shell scripts | fix what it reports |
| `biome` | formatting and linting of TypeScript, JSON and CSS, per [biome.json](biome.json) | `npx biome check --write .` |
| `tsc` | TypeScript types, per [tsconfig.json](tsconfig.json) | fix the types |

The configuration is [.pre-commit-config.yaml](.pre-commit-config.yaml). `--no-verify` and `SKIP=` are not the fix: a
red hook is a real finding, and if a rule is wrong for this repository, change its configuration in the same pull
request and say why. The same hooks run in CI, so skipping them locally only moves the failure somewhere slower.

## Continuous integration

| Workflow | Triggers on | What it does | Reproduce locally |
| --- | --- | --- | --- |
| [quality.yaml](.github/workflows/quality.yaml) | push to `main`, every pull request | `pre-commit` job: every hook; `test` job: the Playwright suite, uploading `test-results/` when it fails | `pre-commit run --all-files`, `npm test` |
| [build.yaml](.github/workflows/build.yaml) | push to `main` and pull requests touching `src/`, `scripts/`, the npm manifests, `.node-version` or the workflow; manual; called by `release` | renders both PDFs and uploads them as the `resume-pdf` artifact | `npm run build` |
| [security.yaml](.github/workflows/security.yaml) | push to `main`, every pull request, every Monday, manual | Trivy scan of the repository for vulnerabilities and secrets; reports to GitHub code scanning, fails on fixable `HIGH` and `CRITICAL` findings | `trivy fs --scanners vuln,secret --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .` |
| [release.yaml](.github/workflows/release.yaml) | tag `v*` | checks the tag matches the `package.json` version, runs `build`, creates the GitHub Release with generated notes and both PDFs attached | none, it publishes; `scripts/release.sh --dry-run <version>` previews the release commit and tag |

The `quality` jobs, `build` and the `security` gate are blocking. The workflows use no secret beyond the
automatic `GITHUB_TOKEN`: `security` needs `security-events: write` to upload its report, which a fork's pull
request does not get, so that upload is skipped there; `release` needs `contents: write` to create the release.

Dependabot ([.github/dependabot.yaml](.github/dependabot.yaml)) proposes weekly updates of the GitHub Actions and npm
dependencies.

## Submitting a change

- Branch from `main` and open a pull request.
- Commit subjects are imperative and lowercase, around 50 characters; follow `git log --oneline`.
- The pull request has green CI, updates both languages, and updates the documentation it affects.
- Label it `enhancement`, `bug`, `accessibility` or `documentation`: [.github/release.yaml](.github/release.yaml) sorts
  the release notes by these labels.
- Releases are cut by the maintainer with [scripts/release.sh](scripts/release.sh), never by tagging by hand.
