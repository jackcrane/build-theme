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
    DIRECTIVE = /\|[ \t]*:(expandafter|paginate)(?:="([^"]*)"|=(\d+))?[ \t]*$/.freeze
    MARKER = /@@(?:EXPAND(?:AFTER:([0-9a-f]*)|EVERY:(\d+))|PAGINATE:(\d*))@@/.freeze
    DEFAULT_PAGE_SIZE = 10
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

        line.sub(DIRECTIVE) do
          match = Regexp.last_match
          token =
            if match[1] == "paginate"
              "PAGINATE:#{match[3]}"
            elsif match[3]
              "EXPANDEVERY:#{match[3]}"
            else
              "EXPANDAFTER:#{match[2].to_s.unpack1('H*')}"
            end
          " @@#{token}@@ |"
        end
      end.join
    end

    # Returns the label (String, "" for default) or an Integer page size.
    def self.extract_marker(row)
      marker = nil
      row.xpath(".//text()").each do |node|
        next unless (match = node.content.match(MARKER))

        marker =
          if match[3]
            [:paginate, match[3].to_i]
          elsif match[2]
            match[2].to_i
          else
            [match[1]].pack("H*").force_encoding("UTF-8")
          end
        node.content = node.content.sub(MARKER, "").rstrip
      end
      marker
    end

    def self.page_size_for(marker)
      size = marker.is_a?(Array) ? marker[1] : marker
      size.is_a?(Integer) && size.positive? ? size : DEFAULT_PAGE_SIZE
    end

    def self.trigger_row(level, columns, label)
      Nokogiri::HTML::DocumentFragment.parse(
        %(<tr class="table-expand" data-expand-trigger="#{level}") +
        %(#{level > 1 ? %( data-expand-level="#{level - 1}" hidden) : ""}>) +
        %(<td colspan="#{columns}"><button type="button" class="table-expand__button">) +
        %(#{CGI.escapeHTML(label)}</button></td></tr>)
      ).children.first
    end

    def self.decorate(html)
      return html unless html.to_s.match?(MARKER)

      fragment = Nokogiri::HTML::DocumentFragment.parse(html)

      fragment.css("table").each do |table|
        rows = table.css("tr")
        header = rows.first if rows.first&.parent&.name == "thead"
        page_size = nil
        level = 0
        rows_since_trigger = 0
        paginate = false
        body_index = 0

        rows.each_with_index do |row, index|
          marker = extract_marker(row)

          if row == header
            page_size = marker ? page_size_for(marker) : nil
            paginate = marker.is_a?(Array)
            table["data-paginate"] = page_size.to_s if paginate
            next
          end

          if paginate
            page = (body_index / page_size) + 1
            body_index += 1
            row["data-page"] = page.to_s
            row["hidden"] = "" if page > 1
            next
          end

          if level.positive?
            row["data-expand-level"] = level.to_s
            row["hidden"] = ""
          end
          rows_since_trigger += 1
          next unless index < rows.size - 1

          if marker || (page_size && rows_since_trigger >= page_size)
            label = marker.is_a?(String) && !marker.empty? ? marker : DEFAULT_LABEL
            level += 1
            row.add_next_sibling(trigger_row(level, row.xpath("./td | ./th").size, label))
            rows_since_trigger = 0
          end
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
