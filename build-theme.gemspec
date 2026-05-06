# frozen_string_literal: true

require_relative "lib/build_theme/version"

Gem::Specification.new do |spec|
  spec.name          = "build-theme"
  spec.version       = BuildTheme::VERSION
  spec.authors       = ["Jack Crane"]
  spec.email         = ["3jbc22@gmail.com"]

  spec.summary       = "Jekyll theme and content plugin for long-form writing sites."
  spec.homepage      = "https://github.com/jackcrane/build-theme"
  spec.license       = "MIT"
  spec.required_ruby_version = ">= 3.0"

  spec.metadata["source_code_uri"] = spec.homepage
  spec.metadata["bug_tracker_uri"] = "#{spec.homepage}/issues"
  spec.metadata["plugin_type"] = "theme"

  spec.files = `git ls-files -z`.split("\x0").select do |file|
    file.match?(%r!^(assets|_data|_layouts|_includes|_sass|lib|LICENSE|README|_config\.yml)!i)
  end

  spec.require_paths = ["lib"]

  spec.add_runtime_dependency "jekyll", "~> 4.4"
  spec.add_runtime_dependency "nokogiri", ">= 1.16", "< 2.0"
end
