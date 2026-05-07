# frozen_string_literal: true

require "cgi"
require "jekyll"

module BuildTheme
  module Admonitions
    OPENING_FENCE = /\A:::\s*([a-zA-Z][\w-]*)\s*\z/.freeze
    CLOSING_FENCE = /\A:::\s*\z/.freeze

    ADMONITION_TYPES = {
      "note" => "note",
      "tip" => "tip",
      "important" => "important",
      "warning" => "warning",
      "caution" => "caution"
    }.freeze

    def self.registered_types
      ADMONITION_TYPES.keys
    end

    def self.transform(content)
      return content if content.to_s.empty?

      lines = content.lines
      output = +""
      inside_admonition = false
      admonition_type = nil
      admonition_lines = []

      lines.each do |line|
        if inside_admonition
          if line.match?(CLOSING_FENCE)
            output << render_admonition(admonition_type, admonition_lines.join)
            inside_admonition = false
            admonition_type = nil
            admonition_lines = []
          else
            admonition_lines << line
          end
          next
        end

        match = line.match(OPENING_FENCE)

        if match
          normalized_type = normalize_type(match[1])

          if normalized_type
            inside_admonition = true
            admonition_type = normalized_type
            admonition_lines = []
            next
          end
        end

        output << line
      end

      if inside_admonition
        output << "::: #{admonition_type}\n"
        output << admonition_lines.join
      end

      output
    rescue StandardError => error
      Jekyll.logger.warn("Admonitions:", "Falling back to unmodified content: #{error.message}")
      content
    end

    def self.normalize_type(type)
      ADMONITION_TYPES[type.to_s.downcase]
    end
    private_class_method :normalize_type

    def self.render_admonition(type, body)
      escaped_type = CGI.escapeHTML(type)

      <<~HTML
        <div class="admonition admonition--#{escaped_type}" markdown="1">
        #{body}</div>
      HTML
    end
    private_class_method :render_admonition
  end
end

Jekyll::Hooks.register [:pages, :documents], :pre_render do |document|
  document.content = BuildTheme::Admonitions.transform(document.content)
end
