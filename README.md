# resume

Guillaume Leroy's résumé, written in HTML in English and French and rendered to A4 PDF.

## Description

Two hand-written HTML pages, [src/cv.en.html](src/cv.en.html) and [src/cv.fr.html](src/cv.fr.html), share one
stylesheet. They read as a responsive page in a browser and print to a two-page A4 PDF through headless Chromium.

CI renders the PDFs on every change to the sources, and each `v*` tag publishes both of them as assets of a GitHub
Release.

It is not a résumé generator: there is no template and no data file, the content is edited directly in the HTML.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the design and the reasoning behind it.

## Getting started

### Prerequisites

- Node.js ≥ 24 and npm (CI uses the version in [.node-version](.node-version))

### Installation

```sh
git clone https://github.com/leroyguillaume/resume.git
cd resume
npm ci
```

Then download the Chromium build Playwright drives.

**macOS**

```sh
npx playwright install chromium
```

**Linux** (`--with-deps` also installs the system libraries Chromium needs, through `apt`)

```sh
npx playwright install --with-deps chromium
```

### Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `RESUME_LOG_LEVEL` | no | `info` | Verbosity of the build logs: `debug`, `info`, `warn` or `error` |

### Usage

Open [src/cv.en.html](src/cv.en.html) or [src/cv.fr.html](src/cv.fr.html) in a browser. The font is loaded from
`node_modules`, so run `npm ci` first.

Render both PDFs to `dist/guillaume-leroy-en.pdf` and `dist/guillaume-leroy-fr.pdf`:

```sh
npm run build
```

The PDFs of the latest release are always available at the same URLs:

- <https://github.com/leroyguillaume/resume/releases/latest/download/guillaume-leroy-en.pdf>
- <https://github.com/leroyguillaume/resume/releases/latest/download/guillaume-leroy-fr.pdf>

### Releasing

Releases are cut with [scripts/release.sh](scripts/release.sh) and nothing else. It sets the version in
`package.json`, commits, creates the `v<version>` tag and asks before pushing; the pushed tag makes CI publish the
PDFs.

```sh
scripts/release.sh 1.0.0
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
