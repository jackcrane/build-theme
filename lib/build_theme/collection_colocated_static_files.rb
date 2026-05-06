# frozen_string_literal: true

require "jekyll"
require "pathname"

module BuildTheme
  class CollectionColocatedStaticFile < Jekyll::StaticFile
    def initialize(site, source_path, output_url)
      @source_path = source_path
      @output_url = output_url

      source_root = Pathname.new(site.source)
      relative_path = Pathname.new(source_path).relative_path_from(source_root).to_s

      super(site, site.source, File.dirname(relative_path), File.basename(source_path))

      @relative_path = relative_path
    end

    def path
      @source_path
    end

    def url
      @output_url
    end

    def destination(dest)
      @site.in_dest_dir(dest, @output_url.delete_prefix("/"))
    end
  end

  class CollectionColocatedStaticFilesGenerator < Jekyll::Generator
    priority :lowest

    MARKDOWN_EXTENSIONS = %w[
      .markdown
      .md
      .mdown
      .mkd
      .mkdn
    ].freeze

    def generate(site)
      supported_labels(site).each do |collection_label|
        collection = site.collections[collection_label]
        next unless collection

        remove_default_collection_static_files(site, collection)

        collection.docs.each do |document|
          add_static_files_for_document(site, document)
        end
      end
    end

    private

    def supported_labels(site)
      configured = site.config.dig("build_theme", "colocated_asset_collections")
      labels = BuildTheme.normalize_labels(configured)
      labels = %w[articles resources] if labels.empty?
      labels.select { |label| site.collections.key?(label) }
    end

    def remove_default_collection_static_files(site, collection)
      doc_dirs = collection.docs.map { |document| File.dirname(document.path) }

      collection.files.reject! do |file|
        doc_dirs.any? { |dir| file.path.start_with?("#{dir}/") }
      end

      site.static_files.reject! do |file|
        next false unless file.is_a?(Jekyll::StaticFile)
        next false if file.is_a?(CollectionColocatedStaticFile)
        next false unless file.instance_variable_get(:@collection) == collection

        doc_dirs.any? { |dir| file.path.start_with?("#{dir}/") }
      end
    end

    def add_static_files_for_document(site, document)
      document_dir = File.dirname(document.path)
      public_dir = resolved_public_dir(site, document)

      Dir.glob(File.join(document_dir, "**", "*"), File::FNM_DOTMATCH).sort.each do |source_path|
        next if File.directory?(source_path)
        next if source_path == document.path
        next if markdown_file?(source_path)

        relative_asset_path = Pathname.new(source_path).relative_path_from(Pathname.new(document_dir)).to_s
        output_url = File.join(public_dir, relative_asset_path)

        site.static_files << CollectionColocatedStaticFile.new(site, source_path, output_url)
      end
    end

    def markdown_file?(source_path)
      MARKDOWN_EXTENSIONS.include?(File.extname(source_path).downcase)
    end

    def resolved_public_dir(site, document)
      BuildTheme.ensure_collection_permalink!(site, document)

      url = document.data["permalink"].to_s.strip
      url = document.url.to_s if url.empty?

      if url.empty? || url.include?(":")
        base_path = BuildTheme.collection_url_prefix(site, document.collection.label)
        slug = BuildTheme.resolved_slug(document)
        url = File.join("/", base_path, "#{slug}/")
      end

      url.sub(%r{/*\z}, "")
    end
  end
end
