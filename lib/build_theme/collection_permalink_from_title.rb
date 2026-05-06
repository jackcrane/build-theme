# frozen_string_literal: true

require "jekyll"

module BuildTheme
  class CollectionPermalinkGenerator < Jekyll::Generator
    priority :highest

    def generate(site)
      site.documents.each do |document|
        BuildTheme.ensure_collection_permalink!(site, document)
      end
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

  def self.ensure_collection_permalink!(site, document)
    return if document.data["permalink"]
    return unless document.respond_to?(:collection)
    return unless collection_permalink_from_title?(site, document.collection.label)

    slug = resolved_slug(document)
    return if slug.empty?

    base_path = collection_url_prefix(site, document.collection.label)
    document.data["permalink"] = File.join("/", base_path, "#{slug}/")
  end

  def self.resolved_slug(document)
    explicit_slug = document.data["slug"].to_s.strip
    return explicit_slug unless explicit_slug.empty?

    title_slug = Jekyll::Utils.slugify(document.data["title"].to_s)
    return title_slug unless title_slug.empty?

    basename = File.basename(document.path, File.extname(document.path))
    if basename.casecmp("index").zero?
      dirname_slug = Jekyll::Utils.slugify(File.basename(File.dirname(document.path)))
      return dirname_slug unless dirname_slug.empty?
    end

    document_slug = document.respond_to?(:slug) ? document.slug.to_s.strip : ""
    return document_slug unless document_slug.empty? || document_slug.casecmp("index").zero?

    Jekyll::Utils.slugify(basename)
  end

  def self.normalize_labels(value)
    Array(value).map { |label| label.to_s.strip }.reject(&:empty?)
  end
end

Jekyll::Hooks.register :documents, :pre_render do |document|
  BuildTheme.ensure_collection_permalink!(document.site, document)
end
