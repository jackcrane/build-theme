# Build@SLU OSS

Build@SLU OSS is a Jekyll site for publishing peer-reviewed technical writing, project writeups, and reference material.

The reusable theme now lives in the sibling `../build-theme` repository and is consumed here through Jekyll's `remote_theme` support.

## Requirements

- Ruby `3.2.2` (pinned in [.ruby-version](./.ruby-version))
- Bundler matching `Gemfile.lock` (`4.0.9` at the time of writing)

If `bundle` is picking up the system Ruby instead of your version manager, check `ruby -v` first. This repo will not install cleanly against macOS's default Ruby `2.6`.

## Install

1. Install Ruby `3.2.2` with your preferred version manager (`rbenv`, `asdf`, `mise`, etc.).
2. Install Bundler for the version locked by the repo:

   ```sh
   gem install bundler -v 4.0.9
   ```

3. Install project dependencies:

   ```sh
   bundle install
   ```

If you change the remote theme dependency or want to clear cached theme output,
run:

```sh
bundle exec jekyll clean
```

## Run Locally

Start the local development server:

```sh
bundle exec jekyll serve --livereload
```

Then open <http://127.0.0.1:4000>.

Useful commands:

- `bundle exec jekyll serve --livereload` runs the site locally and rebuilds on change.
- `bundle exec jekyll build` creates a production build in `_site/`.
- `bundle exec jekyll clean` clears the generated site and cached theme artifacts.

Note: changes to [`_config.yml`](./_config.yml) require restarting the server.

## Theme Split

- This repository owns the content, collections, data files, deployment workflow, custom `_plugins/`, the homepage layout, and brand assets such as the banner and logos.
- The sibling `../build-theme` repository owns the reusable shared layouts, Sass, JavaScript, and non-brand theme assets.

The custom plugins stay here on purpose. Jekyll remote themes do not execute a
theme repository's `_plugins`, so anything required at build time must remain
in the site repository.

## Project Structure

- [`_articles/`](./_articles/) holds published articles.
- [`_resources/`](./_resources/) holds reference pages and guides.
- [`_layouts/home.html`](./_layouts/home.html) overrides the homepage locally.
- [`assets/authors/`](./assets/authors/) holds site-owned author headshots.
- [`assets/images/`](./assets/images/) holds site-owned brand assets such as the homepage banner and logos.
- [`_plugins/`](./_plugins/) contains the custom Jekyll behavior for article permalinks, colocated assets, code fences, plots, and diagrams.

Articles and resources both support colocated assets. If you put files next to an article's `index.md`, those files are published under the same public URL path.

Example:

```text
_articles/my-article/index.md
_articles/my-article/hero.png
_articles/my-article/data.json
```

Inside the article body:

```md
![image](my_image.png)
```

## Creating A New Article

1. Create a new folder under [`_articles/`](./_articles/) for the article.
2. Copy the template from [`_docs/article-template.md`](./_docs/article-template.md) into `index.md`.
3. Fill in the front matter and write the article body.
4. Add any images, CSV files, JSON files, or other static assets in the same folder.
5. Preview the article locally with `bundle exec jekyll serve --livereload`.

Example:

```sh
mkdir -p _articles/my-new-article
cp _docs/article-template.md _articles/my-new-article/index.md
```

### Required And Common Front Matter

At minimum, articles should include:

```yaml
---
layout: post
title: My Article Title
date: 2026-04-11
header_effect: letters
author: Daniel Shown
abstract: A short summary of the article.
---
```

Useful notes:

- `layout: post` should be used for articles.
- `title` is required and is used to generate the default public URL.
- `date` controls the displayed publication date.
- `author` should match a name in [`_data/AUTHORS.yml`](./_data/AUTHORS.yml).
- Add a new entry to [`_data/AUTHORS.yml`](./_data/AUTHORS.yml) before using a brand new author name.
- `abstract` is recommended for article summaries and listings.
- `header_effect` defines the animated hero treatment.
- `toc` does not need to be set manually for articles or resources because it is enabled by default in [`_config.yml`](./_config.yml).

### Article URLs

Articles default to `/posts/<title-slug>/`, generated from the article title.
The folder name under `_articles/` is for organization; the title controls the default permalink.

Example:

- `title: Building a resilient grader` becomes `/posts/building-a-resilient-grader/`

You can still override the URL manually:

```yaml
---
layout: post
title: My Article Title
date: 2026-04-11
permalink: /posts/custom-url/
---
```

## Writing Rich Content

The best reference for authoring is the writing guide:

- Source: [`_resources/writing-guide/index.md`](./_resources/writing-guide/index.md)
- Local URL: `/resources/writing-guide/`

That guide covers the richer features available in articles, including:

- Footnote-style citations using `[^1]` references with definitions at the end
- Mermaid diagrams in fenced `mermaid` blocks
- LaTeX-style math in inline and display form
- Enhanced code blocks with line numbers, highlighted lines, filenames, and file links
- Observable Plot charts with colocated CSV or JSON data sources

## Publishing

This site is deployed by GitHub Actions from [`.github/workflows/pages.yml`](./.github/workflows/pages.yml).

When a theme change is involved, publish in this order:

1. Push the `build-theme` repository changes first.
2. If you want a reproducible theme version, pin `remote_theme` in [`_config.yml`](./_config.yml) to a branch, tag, or commit such as `oss-slu/build-theme@v1.0.0`.
3. Run `bundle exec jekyll build` in this repository to verify the site against the published theme.
4. Push this repository so the Pages workflow rebuilds and deploys the site.

If the theme repository is private, the CI build will need credentials for
remote theme fetches; public GitHub repositories work without extra setup.
