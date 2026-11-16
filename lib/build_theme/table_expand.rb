# frozen_string_literal: true

require "cgi"
require "jekyll"
require "nokogiri"

module BuildTheme
  # Supports a nonstandard table directive:
  #
  #   | 3 | c |:expandafter
  #   | 8 | h |:expandafter="Even more!"
  #
  # Rows after a marked row are hidden behind a "View more" (or custom label)
  # row. Clicking it reveals rows up to the next :expandafter.
  module TableExpand
    DIRECTIVE = /\|[ \t]*:expandafter(?:="([^"]*)")?[ \t]*$/.freeze
    MARKER = /@@EXPANDAFTER:([0-9a-f]*)@@/.freeze
    FENCE = /\A\s*(```|~~~)/.freeze
    DEFAULT_LABEL = "View more"

    def self.encode(content)
      return content if content.to_s.empty?

      in_fence = false
      content.lines.map do |line|
        if line.match?(FENCE)
          in_fence = !in_fence
          next line
        end
        next line if in_fence || !line.lstrip.start_with?("|")

        line.sub(DIRECTIVE) { " @@EXPANDAFTER:#{Regexp.last_match(1).to_s.unpack1('H*')}@@ |" }
      end.join
    end

    def self.decorate(html)
      return html unless html.to_s.match?(MARKER)

      fragment = Nokogiri::HTML::DocumentFragment.parse(html)

      fragment.css("table").each do |table|
        level = 0

        table.css("tr").each do |row|
          marker = nil
          row.xpath(".//text()").each do |node|
            next unless (match = node.content.match(MARKER))

            marker = [match[1]].pack("H*").force_encoding("UTF-8")
            node.content = node.content.sub(MARKER, "").rstrip
          end

          row["data-expand-level"] = level.to_s if level.positive?
          row["hidden"] = "" if level.positive?
          next unless marker

          level += 1
          label = marker.empty? ? DEFAULT_LABEL : marker
          columns = row.xpath("./td | ./th").size
          trigger = Nokogiri::HTML::DocumentFragment.parse(
            %(<tr class="table-expand" data-expand-trigger="#{level}") +
            %(#{level > 1 ? %( data-expand-level="#{level - 1}" hidden) : ""}>) +
            %(<td colspan="#{columns}"><button type="button" class="table-expand__button">) +
            %(#{CGI.escapeHTML(label)}</button></td></tr>)
          ).children.first
          row.add_next_sibling(trigger)
        end
      end

      fragment.to_html
    rescue StandardError => error
      Jekyll.logger.warn("TableExpand:", "Falling back to unmodified content: #{error.message}")
      html
    end
  end
end

Jekyll::Hooks.register [:pages, :documents], :pre_render do |document|
  document.content = BuildTheme::TableExpand.encode(document.content)
end

Jekyll::Hooks.register [:pages, :documents], :post_convert do |document|
  document.content = BuildTheme::TableExpand.decorate(document.content)
end
