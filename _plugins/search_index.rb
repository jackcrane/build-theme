# frozen_string_literal: true

require 'json'
require 'nokogiri'
require 'set'

module BuildSearch
  class Index
    OUTPUT_PATH = 'search.json'
    EXCLUDED_URLS = Set.new(['/404.html']).freeze

    class << self
      def write(site)
        File.write(File.join(site.dest, OUTPUT_PATH), JSON.generate(documents(site)))
      end

      private

      def documents(site)
        records = site.pages.select(&:html?).map { |page| serialize_page(site, page) }
        records.concat(site.documents.map { |doc| serialize_document(site, doc) })
        records.compact.sort_by { |record| [record['type'], record['title']] }
      end

      def serialize_page(site, page)
        return unless searchable?(page)

        {
          'id' => page.url,
          'url' => page.url,
          'title' => title_for(page),
          'type' => 'page',
          'section' => 'Pages',
          'description' => normalize(page.data['description']),
          'content' => searchable_content(site, page),
          'date' => nil,
          'author' => normalize(page.data['author'])
        }
      end

      def serialize_document(site, doc)
        return unless searchable?(doc)

        collection_label = doc.collection&.label.to_s

        {
          'id' => doc.url,
          'url' => doc.url,
          'title' => title_for(doc),
          'type' => item_type(collection_label),
          'section' => collection_label.tr('_', ' ').split.map(&:capitalize).join(' '),
          'description' => normalize(doc.data['abstract'] || doc.data['description']),
          'content' => searchable_content(site, doc),
          'date' => doc.data['date']&.strftime('%Y-%m-%d'),
          'author' => normalize(doc.data['author'])
        }
      end

      def searchable?(item)
        return false unless item.output
        return false if item.data['search'] == false
        return false if item.data['sitemap'] == false
        return false if title_for(item).empty?
        !EXCLUDED_URLS.include?(item.url)
      end

      def title_for(item)
        normalize(item.data['title'])
      end

      def searchable_content(site, item)
        built_path = item.destination(site.dest)
        return '' unless File.exist?(built_path)

        html = File.read(built_path)
        fragment = search_fragment(html)
        normalize(strip_markup(fragment))
      end

      def item_type(collection_label)
        return 'document' if collection_label.empty?

        collection_label.end_with?('s') ? collection_label[0..-2] : collection_label
      end

      def strip_markup(content)
        Nokogiri::HTML.fragment(content.to_s).text
      end

      def search_fragment(html)
        document = Nokogiri::HTML.parse(html.to_s)
        fragment = document.at_css('main article .post-content') ||
                   document.at_css('main article') ||
                   document.at_css('main') ||
                   document

        fragment.css(
          '.post-content__toc-sticky, [data-scrollspy-toc], script, style, noscript'
        ).remove

        fragment.to_html
      end

      def normalize(value)
        value.to_s.gsub(/\s+/, ' ').strip
      end
    end
  end
end

Jekyll::Hooks.register :site, :post_write do |site|
  BuildSearch::Index.write(site)
end
