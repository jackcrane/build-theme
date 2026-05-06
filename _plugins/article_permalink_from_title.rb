# frozen_string_literal: true

require "jekyll"

module Build
  module ArticlePermalinkFromTitle
    def populate_title
      super

      return unless collection.label == "articles"
      return if data["permalink"]

      title = data["title"].to_s.strip
      return if title.empty?

      data["permalink"] = "/posts/#{Jekyll::Utils.slugify(title)}/"
    end
  end
end

Jekyll::Document.prepend(Build::ArticlePermalinkFromTitle)
