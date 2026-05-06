# build-theme

`build-theme` is a reusable Jekyll theme for publication-heavy sites, notes, essays, and documentation.

This repository is theme-first. It does not ship site content, but it now includes optional Jekyll plugins that mirror the content behavior used by `../build` for date-less, nested writing collections with colocated assets.

## What This Repo Contains

- Shared layouts in `_layouts/`
- Shared Sass in `assets/css/`
- Shared JavaScript in `assets/js/`
- Shared theme icons in `assets/images/`

## What Stays In The Consumer Site

- Posts, pages, collections, and any actual site content
- Brand assets such as your logo, hero art, and author headshots
- `_data/` files such as author metadata

One important caveat: Jekyll remote themes do not run custom plugins from the theme repository. If you consume this via `remote_theme`, copy the plugin files from this repo into the consumer site's `_plugins/` directory.

## Install It

In your site’s `_config.yml`:

```yml
title: My Site
description: Essays, notes, and writeups.
url: https://example.com

remote_theme: jackcrane/build-theme

plugins:
  - jekyll-remote-theme
  - jekyll-feed
  - jekyll-toc
```

In your site’s `Gemfile`:

```ruby
gem "jekyll", "~> 4.4.1"

group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
  gem "jekyll-remote-theme", ">= 0.4.2"
  gem "jekyll-toc"
end

gem "webrick", "~> 1.9"
```

Then install and run:

```sh
bundle install
bundle exec jekyll serve --livereload
```

`jekyll-remote-theme` `0.4.1` has a known compatibility bug that can raise
`undefined method 'configure_sass'` during startup. Use `0.4.2` or newer.

If you want a pinned version instead of following `main`, use:

```yml
remote_theme: jackcrane/build-theme@v1.0.0
```

You can also pin to a branch or commit SHA.

## Layouts

This theme ships three content layouts plus a generic homepage layout:

- `default`: shared shell, nav, footer, math, Mermaid, and JS hooks
- `page`: standard page content
- `post`: article/post layout with optional author card, TOC, and dither header
- `home`: generic landing page with optional hero and latest-content list

## Minimal Site Example

`index.md`

```md
---
layout: home
title: Home
hero_title: Practical writing for curious builders
hero_text: Essays, reference material, and project notes.
---

Welcome to the site.
```

`about.md`

```md
---
layout: page
title: About
permalink: /about/
---

This site collects long-form writing and technical notes.
```

`_posts/2026-05-05-hello.md`

```md
---
layout: post
title: Hello
date: 2026-05-05
toc: true
author: Jane Doe
header_effect: dither
---

## First section

This is a post.
```

## Collection-Based Writing

If you want the same writing workflow as `../build`, use a collection instead of `_posts`. That gives you:

- no date requirement in filenames
- nested content directories
- images, data files, and other assets colocated beside `index.md`

Consumer site `_config.yml`:

```yml
collections:
  articles:
    output: true
    permalink: /posts/:slug/
    sort_by: date

build_theme:
  home_collection: articles
  permalink_from_title_collections:
    - articles
  colocated_asset_collections:
    - articles
```

Example content tree:

```text
_articles/fluid-number-classification/index.md
_articles/fluid-number-classification/hero.png
_articles/fluid-number-classification/data/vectors.json
```

That article will publish at `/posts/fluid-number-classification/`, and its assets will publish under the same path, such as `/posts/fluid-number-classification/hero.png`.

## Theme Configuration

Add these in your site `_config.yml` as needed:

```yml
title: My Site
description: Essays, notes, and writeups.
email: hello@example.com

build_theme:
  logo: /assets/images/logo.svg
  logo_mobile: /assets/images/logo-mobile.svg
  footer_text: Thoughtful writing about building things.
  footer_email: hello@example.com
  home_collection: posts
  nav:
    - title: About
      url: /about/
    - title: Notes
      url: /notes/
  search:
    enabled: false
    url: /search.json
```

### Supported Settings

- `build_theme.logo`: optional header logo image
- `build_theme.logo_mobile`: optional small-screen logo image
- `build_theme.footer_text`: footer copy
- `build_theme.footer_email`: footer email link
- `build_theme.home_collection`: collection shown by the `home` layout, default `posts`
- `build_theme.permalink_from_title_collections`: collections that should default to `/<prefix>/<title-slug>/`; defaults to `articles` and `resources`
- `build_theme.colocated_asset_collections`: collections whose non-Markdown files should be published beside the document URL; defaults to `articles` and `resources`
- `build_theme.collection_url_prefixes`: optional map from collection name to URL prefix when you want something other than the collection permalink's first path segment
- `build_theme.nav`: explicit nav items; if omitted, titled pages are auto-listed
- `build_theme.search.enabled`: enables the search modal trigger and JS
- `build_theme.search.url`: endpoint for the search index, default `/search.json`

If no logo is configured, the theme falls back to the site title as text.

## Home Layout Front Matter

The `home` layout supports these page-level options:

```yml
---
layout: home
title: Home
hero_title: Practical writing for curious builders
hero_text: Essays, reference material, and project notes.
hero_image: /assets/images/hero.jpg
home_collection: posts
list_title: Latest Writing
---
```

If `hero_image` is omitted, the homepage renders a text-first hero.
If `hero_image` is set to `dither`, the homepage renders that built-in pattern instead of loading an image path.

## Author Metadata

The `post` layout works without author data, but it can render a richer author card when your site defines `_data/authors.yml` like this:

```yml
- name: Jane Doe
  year: Editor
  image: /assets/authors/jane.jpg
  social:
    github: janedoe
    x: janedoe
    linkedin: jane-doe
    email: jane@example.com
    website: https://example.com
```

Then in a post:

```yml
author: Jane Doe
```

The theme also accepts the older `_data/AUTHORS.yml` shape with a top-level `authors:` key.

## Optional Features

### Table Of Contents

`toc: true` on a `post` expects `jekyll-toc` to be enabled in the consuming site.

### Search

The theme can render a search modal, but it does not generate `search.json` for you.

If you enable search, your site must expose a JSON index at the configured URL. Because remote themes cannot execute theme-side plugins, search index generation still has to live in the consumer repo.

### Math, Mermaid, And Plots

The theme includes client-side support for:

- KaTeX auto-rendering
- Mermaid diagrams
- Observable Plot mounts used by the theme JS

Those features do not require custom theme-side plugins.

## Local Theme Development

This repo is not meant to be the content site. The normal workflow is:

1. Edit this theme repo.
2. Push your changes.
3. In a separate Jekyll site, point `remote_theme` at this repo, branch, tag, or commit.
4. If you need the collection plugins while using `remote_theme`, copy this repo's `_plugins/` files into the consumer site.
5. Run `bundle exec jekyll clean && bundle exec jekyll serve --livereload` in the consumer site.

Example:

```yml
remote_theme: jackcrane/build-theme@my-branch
```

## Publishing Notes

- Public GitHub repos work best for `remote_theme`
- If you use a private theme repo, your CI build needs credentials for the fetch
- Theme `_config.yml` values are not merged into the consuming site, so document required settings in the consumer repo
- Theme `_plugins/` values are not executed by `remote_theme`, so plugin-based behavior must be vendored into the consuming site

## License

MIT, same as [`LICENSE`](./LICENSE).
