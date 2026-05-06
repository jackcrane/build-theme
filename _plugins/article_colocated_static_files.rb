# frozen_string_literal: true

require "jekyll"
require "pathname"

module Build
  class ArticleColocatedStaticFile < Jekyll::StaticFile
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

  class ArticleColocatedStaticFilesGenerator < Jekyll::Generator
    priority :lowest

    MARKDOWN_EXTENSIONS = %w[
      .markdown
      .md
      .mdown
      .mkd
      .mkdn
    ].freeze
    SUPPORTED_COLLECTIONS = %w[articles resources].freeze

    def generate(site)
      SUPPORTED_COLLECTIONS.each do |collection_name|
        next unless site.collections.key?(collection_name)

        collection = site.collections[collection_name]
        remove_default_collection_static_files(site, collection)

        collection.docs.each do |document|
          add_static_files_for_document(site, document)
        end
      end
    end

    private

    def remove_default_collection_static_files(site, collection)
      doc_dirs = collection.docs.map { |document| File.dirname(document.path) }

      collection.files.reject! do |file|
        doc_dirs.any? { |dir| file.path.start_with?("#{dir}/") }
      end

      site.static_files.reject! do |file|
        next false unless file.is_a?(Jekyll::StaticFile)
        next false if file.is_a?(ArticleColocatedStaticFile)
        next false unless file.instance_variable_get(:@collection) == collection

        doc_dirs.any? { |dir| file.path.start_with?("#{dir}/") }
      end
    end

    def add_static_files_for_document(site, document)
      article_dir = File.dirname(document.path)
      public_dir = resolved_public_dir(document)

      Dir.glob(File.join(article_dir, "**", "*"), File::FNM_DOTMATCH).sort.each do |source_path|
        next if File.directory?(source_path)
        next if source_path == document.path
        next if markdown_file?(source_path)

        relative_asset_path = Pathname.new(source_path).relative_path_from(Pathname.new(article_dir)).to_s
        output_url = File.join(public_dir, relative_asset_path)

        site.static_files << ArticleColocatedStaticFile.new(site, source_path, output_url)
      end
    end

    def markdown_file?(source_path)
      MARKDOWN_EXTENSIONS.include?(File.extname(source_path).downcase)
    end

    def resolved_public_dir(document)
      url = document.data["permalink"].to_s.strip
      url = document.url.to_s if url.empty?

      if url.empty? || url.include?(":")
        collection_root = document.collection.label == "resources" ? "resources" : "posts"
        slug = resolved_slug(document)
        url = "/#{collection_root}/#{slug}/"
      end

      url.sub(%r{/*\z}, "")
    end

    def resolved_slug(document)
      slug = document.data["slug"].to_s.strip
      return slug unless slug.empty?

      if document.respond_to?(:slug)
        document_slug = document.slug.to_s.strip
        return document_slug unless document_slug.empty?
      end

      title_slug = Jekyll::Utils.slugify(document.data["title"].to_s)
      return title_slug unless title_slug.empty?

      Jekyll::Utils.slugify(File.basename(File.dirname(document.path)))
    end
  end
end
