# frozen_string_literal: true

require "cgi"
require "jekyll"
require "nokogiri"

module Build
  module CitationFootnotes
    MISSING_REFERENCE_REGEX = /\[\^([0-9]+)\]/.freeze
    SKIPPED_TAGS = %w[a code pre script style textarea].freeze
    FOOTNOTES_CLASS = "footnotes"

    def decorate_citations(content)
      return content if content.to_s.empty?

      fragment = Nokogiri::HTML::DocumentFragment.parse(content.to_s)

      fragment.xpath(".//text()").each do |text_node|
        next if skip_text_node?(text_node)

        replacement_html = replace_missing_references(text_node.text)
        next unless replacement_html

        text_node.replace(Nokogiri::HTML::DocumentFragment.parse(replacement_html))
      end

      fragment.to_html
    rescue StandardError => error
      Jekyll.logger.warn("CitationFootnotes:", "Falling back to unmodified content: #{error.message}")
      content
    end

    private

    def skip_text_node?(text_node)
      text_node.ancestors.any? do |ancestor|
        SKIPPED_TAGS.include?(ancestor.name) || footnotes_region?(ancestor)
      end
    end

    def footnotes_region?(node)
      node["class"].to_s.split.include?(FOOTNOTES_CLASS)
    end

    def replace_missing_references(text)
      html = +""
      cursor = 0
      has_match = false

      text.to_enum(:scan, MISSING_REFERENCE_REGEX).each do
        match = Regexp.last_match
        has_match = true

        html << CGI.escapeHTML(text[cursor...match.begin(0)])
        html << missing_reference_markup(match[1])
        cursor = match.end(0)
      end

      return unless has_match

      html << CGI.escapeHTML(text[cursor..])
      html
    end

    def missing_reference_markup(number)
      escaped_number = CGI.escapeHTML(number)

      <<~HTML.chomp
        <sup class="citation citation--missing" title="Citation #{escaped_number} is missing">
          <span class="citation__number">#{escaped_number}</span>
          <span class="citation__missing-copy"> (CITATION MISSING)</span>
        </sup>
      HTML
    end
  end
end

Liquid::Template.register_filter(Build::CitationFootnotes)
