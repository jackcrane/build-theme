# frozen_string_literal: true

require "jekyll"

module BuildTheme
  module CollectionPermalinkFromTitle
    def populate_title
      super

      return if data["permalink"]
      return unless BuildTheme.collection_permalink_from_title?(site, collection.label)

      title = data["title"].to_s.strip
      return if title.empty?

      base_path = BuildTheme.collection_url_prefix(site, collection.label)
      data["permalink"] = File.join("/", base_path, "#{Jekyll::Utils.slugify(title)}/")
    end
  end

  def self.collection_permalink_from_title?(site, collection_label)
    configured = site.config.dig("build_theme", "permalink_from_title_collections")
    labels = normalize_labels(configured)
    labels = %w[articles resources] if labels.empty?
    labels.include?(collection_label)
  end

  def self.collection_url_prefix(site, collection_label)
    configured = site.config.dig("build_theme", "collection_url_prefixes")
    prefix = configured.is_a?(Hash) ? configured[collection_label] : nil
    prefix = prefix.to_s.strip
    return prefix.delete_prefix("/").delete_suffix("/") unless prefix.empty?

    collection = site.collections[collection_label]
    template = collection&.metadata&.fetch("permalink", nil).to_s
    first_segment = template.split("/").find { |segment| !segment.empty? && !segment.start_with?(":") }
    return first_segment unless first_segment.to_s.empty?

    collection_label
  end

  def self.normalize_labels(value)
    Array(value).map { |label| label.to_s.strip }.reject(&:empty?)
  end
end

Jekyll::Document.prepend(BuildTheme::CollectionPermalinkFromTitle)
