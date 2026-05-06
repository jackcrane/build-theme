# frozen_string_literal: true

require "cgi"
require "json"
require "jekyll"
require "rouge"
require "strscan"

module BuildTheme
  module CodeFenceOptions
    class PlotFenceParseError < StandardError; end

    LANGUAGE_ICON_SLUGS = {
      "bash" => "gnubash",
      "sh" => "gnubash",
      "c" => "c",
      "cpp" => "cplusplus",
      "csharp" => "csharp",
      "css" => "css",
      "diff" => "git",
      "docker" => "docker",
      "dockerfile" => "docker",
      "elixir" => "elixir",
      "go" => "go",
      "graphql" => "graphql",
      "html" => "html5",
      "java" => "openjdk",
      "javascript" => "javascript",
      "js" => "javascript",
      "json" => "json",
      "jsx" => "react",
      "kotlin" => "kotlin",
      "lua" => "lua",
      "markdown" => "markdown",
      "md" => "markdown",
      "php" => "php",
      "python" => "python",
      "py" => "python",
      "ruby" => "ruby",
      "rust" => "rust",
      "scss" => "sass",
      "shell" => "gnubash",
      "sql" => "postgresql",
      "swift" => "swift",
      "toml" => "toml",
      "tsx" => "react",
      "typescript" => "typescript",
      "ts" => "typescript",
      "vim" => "vim",
      "xml" => "xml",
      "yaml" => "yaml",
      "yml" => "yaml",
      "zsh" => "zsh"
    }.freeze

    FENCE_REGEX = /
      (^|\n)
      ```([^\n]*)
      \n
      (.*?)
      \n```\s*(?=\n|$)
    /mx.freeze

    LANGUAGE_REGEX = /\A[a-zA-Z0-9.+#_-]+\z/.freeze
    PLOT_SOURCE_NAME_REGEX = /\A[a-zA-Z_$][a-zA-Z0-9_$]*\z/.freeze
    STRIP_LINE_TERMINATORS = %r!\A(\n|\r)+|(\n|\r)+\z!.freeze
    ESCAPED_TRIPLE_BACKTICKS = '\`\`\`'
    @plot_block_index = 0

    def self.transform(content)
      content.gsub(FENCE_REGEX) do
        leading = Regexp.last_match(1)
        info_string = Regexp.last_match(2).to_s.strip
        code = Regexp.last_match(3)

        transformed = transform_fence(info_string, code)
        transformed ? "#{leading}#{transformed}" : Regexp.last_match(0)
      end
    end

    def self.transform_fence(info_string, code)
      return nil if info_string.empty?

      parts = info_string.split(/\s+/, 2)
      lang = parts.first
      return nil unless lang&.match?(LANGUAGE_REGEX)

      lang = lang.downcase
      return render_mermaid_html(code) if lang == "mermaid"
      return render_plot_html(code, parts[1].to_s) if lang == "plot"

      options = parse_options(parts[1].to_s)
      return nil if options.empty?

      render_highlighted_html(lang, code, options)
    end

    def self.parse_options(options_string)
      options = {}
      scanner = StringScanner.new(options_string)

      until scanner.eos?
        scanner.skip(/\s+/)

        if (linenos_value = scanner.scan(/:linenos(?:=(\d+))?/))
          options[:linenos] = true
          if (match = linenos_value.match(/=(\d+)/))
            options[:start_line] = match[1].to_i
          end
        elsif (highlight_value = scanner.scan(/:highlight=(\{[0-9,\s]+\}|\d+)/))
          numbers = highlight_value.sub(":highlight=", "").delete("{}").split(",").map(&:strip).reject(&:empty?).map(&:to_i)
          options[:highlight_lines] = numbers if numbers.any?
        elsif scanner.scan(/:filename=/)
          options[:filename] = parse_option_value(scanner)
        elsif scanner.scan(/:filehref=/)
          options[:filehref] = parse_option_value(scanner)
        else
          scanner.scan(/\S+/)
        end
      end

      options
    end

    def self.parse_option_value(scanner)
      if scanner.scan(/"([^"]*)"/)
        scanner[1]
      elsif scanner.scan(/'([^']*)'/)
        scanner[1]
      else
        scanner.scan(/[^\s]+/)
      end
    end

    def self.render_highlighted_html(lang, code, options)
      code = code.gsub(STRIP_LINE_TERMINATORS, "")
      code = code.gsub(ESCAPED_TRIPLE_BACKTICKS, "```")
      lexer = Rouge::Lexer.find_fancy(lang, code) || Rouge::Lexers::PlainText
      figure_inner = +""
      header_html = metadata_header_html(lang, options)
      copy_button_html = copy_button_html(options)

      figure_inner << header_html if header_html

      if options[:linenos]
        formatter = Rouge::Formatters::HTMLTable.new(
          line_highlighter_formatter(options),
          :start_line => start_line(options),
          :table_class => "rouge-table",
          :gutter_class => "rouge-gutter",
          :code_class => "rouge-code"
        )

        table_html = formatter.format(lexer.lex(code))
        table_html.sub!(%r{\n</pre></td>\s*</tr></tbody></table>\z}, "</pre></td></tr></tbody></table>")

        figure_inner << copy_button_html unless options[:filename]
        figure_inner << %(<div class="highlight__body">#{table_html}</div>)
        %(<figure class="highlight" data-lang="#{CGI.escapeHTML(lang)}">#{figure_inner}</figure>)
      else
        highlighted = line_highlighter_formatter(options).format(lexer.lex(code))
        figure_inner << copy_button_html unless options[:filename]
        figure_inner << %(<div class="highlight__body"><pre><code class="language-#{lang.tr("+", "-")}" data-lang="#{CGI.escapeHTML(lang)}">#{highlighted.chomp}</code></pre></div>)
        %(<figure class="highlight" data-lang="#{CGI.escapeHTML(lang)}">#{figure_inner}</figure>)
      end
    end

    def self.render_mermaid_html(code)
      diagram = CGI.escapeHTML(code.gsub(STRIP_LINE_TERMINATORS, ""))
      %(<div class="mermaid-block"><div class="mermaid">#{diagram}</div></div>)
    end

    def self.render_plot_html(code, sources_string)
      plot_code = strip_js_comments(code.gsub(STRIP_LINE_TERMINATORS, ""))
      return nil if plot_code.empty?

      sources = parse_plot_sources(sources_string)
      block_id = next_plot_block_id
      sources_json = escape_script_content(JSON.generate(sources))
      plot_code_html = escape_script_content(plot_code)

      <<~HTML.gsub(STRIP_LINE_TERMINATORS, "")
        <div class="plot-block" data-plot-block id="#{block_id}">
          <div class="plot-block__mount" data-plot-mount aria-label="Observable plot"></div>
          <script type="application/json" class="plot-block__sources">#{sources_json}</script>
          <script type="text/plain" class="plot-block__code">#{plot_code_html}</script>
        </div>
      HTML
    rescue PlotFenceParseError
      nil
    end

    def self.parse_plot_sources(sources_string)
      scanner = StringScanner.new(sources_string.to_s)
      sources = {}

      until scanner.eos?
        scanner.skip(/\s+/)
        break if scanner.eos?

        source_name = scanner.scan(/[a-zA-Z_$][a-zA-Z0-9_$]*/)
        raise PlotFenceParseError unless source_name&.match?(PLOT_SOURCE_NAME_REGEX)
        raise PlotFenceParseError unless scanner.scan(/=/)

        source_path = parse_option_value(scanner)
        raise PlotFenceParseError if source_path.nil? || source_path.empty?

        sources[source_name] = source_path
      end

      sources
    end

    def self.next_plot_block_id
      @plot_block_index += 1
      "plot-block-#{@plot_block_index}"
    end

    def self.escape_script_content(value)
      value.to_s.gsub("</script", '<\/script')
    end

    def self.strip_js_comments(source)
      result = +""
      i = 0
      length = source.length
      state = nil
      template_expression_depth = 0

      while i < length
        char = source[i]
        next_char = i + 1 < length ? source[i + 1] : nil

        if state.nil?
          if char == "/" && next_char == "/"
            i += 2
            i += 1 while i < length && source[i] != "\n"
            next
          elsif char == "/" && next_char == "*"
            i += 2
            while i + 1 < length && !(source[i] == "*" && source[i + 1] == "/")
              i += 1
            end
            i += 2
            next
          elsif char == '"'
            state = :double_quote
          elsif char == "'"
            state = :single_quote
          elsif char == "`"
            state = :template
          end
        elsif state == :double_quote
          state = nil if char == '"' && source[i - 1] != "\\"
        elsif state == :single_quote
          state = nil if char == "'" && source[i - 1] != "\\"
        elsif state == :template
          if char == "`" && source[i - 1] != "\\"
            state = nil
          elsif char == "$" && next_char == "{" && source[i - 1] != "\\"
            template_expression_depth += 1
          elsif char == "}" && template_expression_depth.positive?
            template_expression_depth -= 1
          end
        end

        result << char
        i += 1
      end

      result
    end

    def self.metadata_header_html(lang, options)
      filename = options[:filename]
      return nil unless filename

      icon_slug = LANGUAGE_ICON_SLUGS[lang]
      filehref = options[:filehref]

      html = +%(<figcaption class="highlight__meta">)

      if icon_slug
        icon_alt = "#{lang} icon"
        icon_src = "https://cdn.simpleicons.org/#{CGI.escapeHTML(icon_slug)}"
        html << %(<img class="highlight__icon" src="#{icon_src}" alt="#{CGI.escapeHTML(icon_alt)}" loading="lazy" decoding="async">)
      end

      if filehref
        html << %(<a class="highlight__filename highlight__filename-link" href="#{CGI.escapeHTML(filehref)}" target="_blank" rel="noopener noreferrer">#{CGI.escapeHTML(filename)}</a>)
      else
        html << %(<span class="highlight__filename">#{CGI.escapeHTML(filename)}</span>)
      end

      html << copy_button_html(options)
      html << "</figcaption>"
      html
    end

    def self.copy_button_html(options)
      location_class = options[:filename] ? "highlight__copy-button--meta" : "highlight__copy-button--floating"
      copy_icon = %(<svg class="highlight__copy-icon highlight__copy-icon--copy" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /></svg>)
      check_icon = %(<svg class="highlight__copy-icon highlight__copy-icon--check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 12l5 5l10 -10" /></svg>)

      %(<button class="highlight__copy-button #{location_class}" type="button" aria-label="Copy code" data-copy-label="Copy code" data-copied-label="Copied">#{copy_icon}#{check_icon}</button>)
    end

    def self.line_highlighter_formatter(options)
      Rouge::Formatters::HTMLLineHighlighter.new(
        Rouge::Formatters::HTML.new,
        :highlight_lines => relative_highlight_lines(options)
      )
    end

    def self.start_line(options)
      options[:start_line] || 1
    end

    def self.relative_highlight_lines(options)
      return [] unless options[:highlight_lines]

      options[:highlight_lines].filter_map do |line|
        relative = line - start_line(options) + 1
        relative if relative.positive?
      end
    end
  end
end

Jekyll::Hooks.register [:pages, :documents], :pre_render do |doc|
  next unless doc.content&.include?("```")

  doc.content = BuildTheme::CodeFenceOptions.transform(doc.content)
end
