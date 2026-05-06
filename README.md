# build-theme

`build-theme` is the shared Jekyll presentation layer for Build@SLU OSS.
It contains the reusable layouts, Sass, JavaScript, and static images that the
publishing site consumes through `remote_theme`.

## What Lives Here

- `_layouts/` for the shared site shell and page/article templates
- `assets/css/` for the shared Sass entrypoint and partials
- `assets/js/` for interactive theme behavior
- `assets/images/` for shared theme icons and other non-brand imagery

## What Does Not Live Here

This repository intentionally does not contain site content or site-specific
build behavior.

- Articles, resources, pages, and the homepage layout stay in the consumer site repo.
- `_data/AUTHORS.yml` stays in the consumer site repo.
- Brand assets such as the banner and logos stay in the consumer site repo.
- Custom `_plugins/` stay in the consumer site repo.

That last point matters for publishing: Jekyll remote themes do not execute
custom plugins from the theme repository, so plugin code must remain in the
site repository that runs the build.

## Consuming The Theme

In the site repository, add the remote theme and plugin:

```yaml
remote_theme: jackcrane/build-theme

plugins:
  - jekyll-remote-theme
  - jekyll-feed
  - jekyll-toc
```

And in the site `Gemfile`:

```ruby
group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
  gem "jekyll-remote-theme"
  gem "jekyll-toc"
end
```

## Local Development

Theme changes are previewed from the consumer site, not from this repository by
itself.

1. Publish or push your theme changes to the remote repository referenced by
   `remote_theme`.
2. In the consumer site repo, run:

   ```sh
   bundle install
   bundle exec jekyll clean
   bundle exec jekyll serve --livereload
   ```

3. Open `http://127.0.0.1:4000`.

If you want to test a branch, tag, or commit before merging, point the consumer
site at that ref:

```yaml
remote_theme: jackcrane/build-theme@my-branch
```

Use a tag or commit SHA when you want reproducible builds.

## Publishing

Recommended order:

1. Push the theme repository to GitHub as `jackcrane/build-theme`.
2. Verify the branch, tag, or commit you want the site to consume exists on the
   remote.
3. Update the consumer site's `remote_theme` value if you are pinning to a
   specific ref.
4. Run `bundle exec jekyll build` in the consumer site repo.
5. Push the consumer site changes so GitHub Actions can rebuild and deploy the
   site.

For GitHub Pages through GitHub Actions, the theme repository should be public
unless you have added authentication for remote theme fetches during CI.
