(function () {
  var DEFAULT_PIXEL_SIZE = 4;
  var DEFAULT_MAX_DPR = 1.25;
  var DEFAULT_TARGET_FPS = 24;

  var vertexShaderSource = [
    "attribute vec2 a_position;",
    "void main() {",
    "  gl_Position = vec4(a_position, 0.0, 1.0);",
    "}"
  ].join("\n");

  var fragmentShaderSource = [
    "precision highp float;",
    "uniform vec2 resolution;",
    "uniform float time;",
    "uniform float waveSpeed;",
    "uniform float waveFrequency;",
    "uniform float waveAmplitude;",
    "uniform vec3 waveColor;",
    "uniform float colorNum;",
    "uniform float pixelSize;",
    "",
    "vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }",
    "vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }",
    "vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }",
    "vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }",
    "",
    "float cnoise(vec2 P) {",
    "  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);",
    "  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);",
    "  Pi = mod289(Pi);",
    "  vec4 ix = Pi.xzxz;",
    "  vec4 iy = Pi.yyww;",
    "  vec4 fx = Pf.xzxz;",
    "  vec4 fy = Pf.yyww;",
    "  vec4 i = permute(permute(ix) + iy);",
    "  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;",
    "  vec4 gy = abs(gx) - 0.5;",
    "  vec4 tx = floor(gx + 0.5);",
    "  gx = gx - tx;",
    "  vec2 g00 = vec2(gx.x, gy.x);",
    "  vec2 g10 = vec2(gx.y, gy.y);",
    "  vec2 g01 = vec2(gx.z, gy.z);",
    "  vec2 g11 = vec2(gx.w, gy.w);",
    "  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));",
    "  g00 *= norm.x;",
    "  g01 *= norm.y;",
    "  g10 *= norm.z;",
    "  g11 *= norm.w;",
    "  float n00 = dot(g00, vec2(fx.x, fy.x));",
    "  float n10 = dot(g10, vec2(fx.y, fy.y));",
    "  float n01 = dot(g01, vec2(fx.z, fy.z));",
    "  float n11 = dot(g11, vec2(fx.w, fy.w));",
    "  vec2 fade_xy = fade(Pf.xy);",
    "  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);",
    "  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);",
    "}",
    "",
    "const int OCTAVES = 4;",
    "float fbm(vec2 p) {",
    "  float value = 0.0;",
    "  float amp = 1.0;",
    "  float freq = waveFrequency;",
    "  for (int i = 0; i < OCTAVES; i++) {",
    "    value += amp * abs(cnoise(p));",
    "    p *= freq;",
    "    amp *= waveAmplitude;",
    "  }",
    "  return value;",
    "}",
    "",
    "float pattern(vec2 p) {",
    "  vec2 p2 = p - time * waveSpeed;",
    "  return fbm(p + fbm(p2));",
    "}",
    "",
    "float bayer8x8(vec2 coord) {",
    "  int x = int(mod(coord.x, 8.0));",
    "  int y = int(mod(coord.y, 8.0));",
    "",
    "  if (y == 0) {",
    "    if (x == 0) return 0.0 / 64.0;",
    "    if (x == 1) return 48.0 / 64.0;",
    "    if (x == 2) return 12.0 / 64.0;",
    "    if (x == 3) return 60.0 / 64.0;",
    "    if (x == 4) return 3.0 / 64.0;",
    "    if (x == 5) return 51.0 / 64.0;",
    "    if (x == 6) return 15.0 / 64.0;",
    "    return 63.0 / 64.0;",
    "  }",
    "  if (y == 1) {",
    "    if (x == 0) return 32.0 / 64.0;",
    "    if (x == 1) return 16.0 / 64.0;",
    "    if (x == 2) return 44.0 / 64.0;",
    "    if (x == 3) return 28.0 / 64.0;",
    "    if (x == 4) return 35.0 / 64.0;",
    "    if (x == 5) return 19.0 / 64.0;",
    "    if (x == 6) return 47.0 / 64.0;",
    "    return 31.0 / 64.0;",
    "  }",
    "  if (y == 2) {",
    "    if (x == 0) return 8.0 / 64.0;",
    "    if (x == 1) return 56.0 / 64.0;",
    "    if (x == 2) return 4.0 / 64.0;",
    "    if (x == 3) return 52.0 / 64.0;",
    "    if (x == 4) return 11.0 / 64.0;",
    "    if (x == 5) return 59.0 / 64.0;",
    "    if (x == 6) return 7.0 / 64.0;",
    "    return 55.0 / 64.0;",
    "  }",
    "  if (y == 3) {",
    "    if (x == 0) return 40.0 / 64.0;",
    "    if (x == 1) return 24.0 / 64.0;",
    "    if (x == 2) return 36.0 / 64.0;",
    "    if (x == 3) return 20.0 / 64.0;",
    "    if (x == 4) return 43.0 / 64.0;",
    "    if (x == 5) return 27.0 / 64.0;",
    "    if (x == 6) return 39.0 / 64.0;",
    "    return 23.0 / 64.0;",
    "  }",
    "  if (y == 4) {",
    "    if (x == 0) return 2.0 / 64.0;",
    "    if (x == 1) return 50.0 / 64.0;",
    "    if (x == 2) return 14.0 / 64.0;",
    "    if (x == 3) return 62.0 / 64.0;",
    "    if (x == 4) return 1.0 / 64.0;",
    "    if (x == 5) return 49.0 / 64.0;",
    "    if (x == 6) return 13.0 / 64.0;",
    "    return 61.0 / 64.0;",
    "  }",
    "  if (y == 5) {",
    "    if (x == 0) return 34.0 / 64.0;",
    "    if (x == 1) return 18.0 / 64.0;",
    "    if (x == 2) return 46.0 / 64.0;",
    "    if (x == 3) return 30.0 / 64.0;",
    "    if (x == 4) return 33.0 / 64.0;",
    "    if (x == 5) return 17.0 / 64.0;",
    "    if (x == 6) return 45.0 / 64.0;",
    "    return 29.0 / 64.0;",
    "  }",
    "  if (y == 6) {",
    "    if (x == 0) return 10.0 / 64.0;",
    "    if (x == 1) return 58.0 / 64.0;",
    "    if (x == 2) return 6.0 / 64.0;",
    "    if (x == 3) return 54.0 / 64.0;",
    "    if (x == 4) return 9.0 / 64.0;",
    "    if (x == 5) return 57.0 / 64.0;",
    "    if (x == 6) return 5.0 / 64.0;",
    "    return 53.0 / 64.0;",
    "  }",
    "  if (x == 0) return 42.0 / 64.0;",
    "  if (x == 1) return 26.0 / 64.0;",
    "  if (x == 2) return 38.0 / 64.0;",
    "  if (x == 3) return 22.0 / 64.0;",
    "  if (x == 4) return 41.0 / 64.0;",
    "  if (x == 5) return 25.0 / 64.0;",
    "  if (x == 6) return 37.0 / 64.0;",
    "  return 21.0 / 64.0;",
    "}",
    "",
    "vec3 dither(vec2 uv, vec3 color) {",
    "  vec2 scaledCoord = floor(uv * resolution / pixelSize);",
    "  float threshold = bayer8x8(scaledCoord) - 0.25;",
    "  float stepValue = 1.0 / max(colorNum - 1.0, 1.0);",
    "  color += threshold * stepValue;",
    "  color = clamp(color - 0.2, 0.0, 1.0);",
    "  return floor(color * max(colorNum - 1.0, 1.0) + 0.5) / max(colorNum - 1.0, 1.0);",
    "}",
    "",
    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / resolution.xy;",
    "  vec2 pixelUv = (pixelSize / resolution) * floor(uv / (pixelSize / resolution));",
    "  vec2 centeredUv = pixelUv - 0.5;",
    "  centeredUv.x *= resolution.x / resolution.y;",
    "",
    "  float f = pattern(centeredUv);",
    "",
    "  vec3 color = mix(vec3(0.0), waveColor, clamp(f, 0.0, 1.0));",
    "  color = dither(uv, color);",
    "",
    "  float luminance = dot(color, vec3(0.3333333));",
    "  float alpha = smoothstep(0.02, 0.42, luminance) * 0.24;",
    "  gl_FragColor = vec4(color * 0.45, alpha);",
    "}"
  ].join("\n");

  function parseNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function parseBoolean(value, fallback) {
    if (value === "true") return true;
    if (value === "false") return false;
    return fallback;
  }

  function parseColor(value, fallback) {
    if (!value) return fallback.slice();
    var parts = value.split(",").map(function (item) {
      return parseNumber(item.trim(), NaN);
    });

    if (parts.length !== 3 || parts.some(function (item) { return !Number.isFinite(item); })) {
      return fallback.slice();
    }

    return parts;
  }

  function clampNumber(value, min, max, fallback) {
    var parsed = parseNumber(value, fallback);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function compileShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(error || "Shader compilation failed");
    }

    return shader;
  }

  function createProgram(gl, vertexSource, fragmentSource) {
    var vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    var fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(error || "Program linking failed");
    }

    return program;
  }

  function DitherHeader(element) {
    this.element = element;
    this.canvas = element.querySelector(".post-title__canvas");
    this.frameId = 0;
    this.lastRenderTime = 0;
    this.startTime = performance.now();
    this.isVisible = true;
    this.isInViewport = true;
    this.prefersReducedMotion = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    this.options = {
      waveColor: parseColor(element.dataset.waveColor, [0.5, 0.5, 0.5]),
      disableAnimation: parseBoolean(element.dataset.disableAnimation, false),
      colorNum: parseNumber(element.dataset.colorNum, 4),
      pixelSize: parseNumber(element.dataset.pixelSize, DEFAULT_PIXEL_SIZE),
      waveAmplitude: parseNumber(element.dataset.waveAmplitude, 0.3),
      waveFrequency: parseNumber(element.dataset.waveFrequency, 3),
      waveSpeed: parseNumber(element.dataset.waveSpeed, 0.05),
      maxDpr: clampNumber(element.dataset.maxDpr, 1, 2, DEFAULT_MAX_DPR),
      targetFps: clampNumber(element.dataset.targetFps, 1, 60, DEFAULT_TARGET_FPS)
    };

    try {
      this.gl = this.canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        desynchronized: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: "low-power"
      });
    } catch (error) {
      this.gl = null;
    }

    if (!this.gl) {
      return;
    }

    this.program = createProgram(this.gl, vertexShaderSource, fragmentShaderSource);
    this.uniforms = {
      resolution: this.gl.getUniformLocation(this.program, "resolution"),
      time: this.gl.getUniformLocation(this.program, "time"),
      waveSpeed: this.gl.getUniformLocation(this.program, "waveSpeed"),
      waveFrequency: this.gl.getUniformLocation(this.program, "waveFrequency"),
      waveAmplitude: this.gl.getUniformLocation(this.program, "waveAmplitude"),
      waveColor: this.gl.getUniformLocation(this.program, "waveColor"),
      colorNum: this.gl.getUniformLocation(this.program, "colorNum"),
      pixelSize: this.gl.getUniformLocation(this.program, "pixelSize")
    };

    this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
    this.buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1
      ]),
      this.gl.STATIC_DRAW
    );

    this.handleResize = this.resize.bind(this);
    this.handleVisibilityChange = this.updateVisibility.bind(this);
    this.handleMotionPreferenceChange = this.handleMotionChange.bind(this);
    this.render = this.render.bind(this);

    window.addEventListener("resize", this.handleResize);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    if (this.prefersReducedMotion) {
      if (this.prefersReducedMotion.addEventListener) {
        this.prefersReducedMotion.addEventListener("change", this.handleMotionPreferenceChange);
      } else if (this.prefersReducedMotion.addListener) {
        this.prefersReducedMotion.addListener(this.handleMotionPreferenceChange);
      }
    }

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.element);
    }

    if (window.IntersectionObserver) {
      this.intersectionObserver = new IntersectionObserver(
        this.handleIntersection.bind(this),
        { threshold: 0 }
      );
      this.intersectionObserver.observe(this.element);
    }

    this.resize();
    this.updateAnimationState();
  }

  DitherHeader.prototype.shouldAnimate = function () {
    return (
      !this.options.disableAnimation &&
      !(this.prefersReducedMotion && this.prefersReducedMotion.matches) &&
      this.isVisible &&
      this.isInViewport
    );
  };

  DitherHeader.prototype.handleIntersection = function (entries) {
    if (!entries || !entries.length) {
      return;
    }

    this.isInViewport = entries[0].isIntersecting;
    this.updateAnimationState();
  };

  DitherHeader.prototype.updateVisibility = function () {
    this.isVisible = !document.hidden;
    this.updateAnimationState();
  };

  DitherHeader.prototype.handleMotionChange = function () {
    this.updateAnimationState();
  };

  DitherHeader.prototype.updateAnimationState = function () {
    window.cancelAnimationFrame(this.frameId);
    this.frameId = 0;

    if (this.shouldAnimate()) {
      this.lastRenderTime = 0;
      this.frameId = window.requestAnimationFrame(this.render);
      return;
    }

    this.renderFrame();
  };

  DitherHeader.prototype.resize = function () {
    if (!this.gl) {
      return;
    }

    var rect = this.element.getBoundingClientRect();
    var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, this.options.maxDpr));
    var width = Math.max(1, Math.round(rect.width * dpr));
    var height = Math.max(1, Math.round(rect.height * dpr));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
      this.renderFrame();
    }

  };

  DitherHeader.prototype.renderFrame = function (now) {
    if (!this.gl) {
      return;
    }

    var gl = this.gl;
    var timestamp = typeof now === "number" ? now : this.startTime;
    var elapsed = this.shouldAnimate() ? (timestamp - this.startTime) / 1000 : 0;

    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.time, elapsed);
    gl.uniform1f(this.uniforms.waveSpeed, this.options.waveSpeed);
    gl.uniform1f(this.uniforms.waveFrequency, this.options.waveFrequency);
    gl.uniform1f(this.uniforms.waveAmplitude, this.options.waveAmplitude);
    gl.uniform3f(
      this.uniforms.waveColor,
      this.options.waveColor[0],
      this.options.waveColor[1],
      this.options.waveColor[2]
    );
    gl.uniform1f(this.uniforms.colorNum, this.options.colorNum);
    gl.uniform1f(this.uniforms.pixelSize, this.options.pixelSize);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  DitherHeader.prototype.render = function (now) {
    if (!this.shouldAnimate()) {
      this.frameId = 0;
      return;
    }

    var minFrameDuration = 1000 / this.options.targetFps;
    if (!this.lastRenderTime || now - this.lastRenderTime >= minFrameDuration) {
      this.lastRenderTime = now;
      this.renderFrame(now);
    }

    this.frameId = window.requestAnimationFrame(this.render);
  };

  DitherHeader.prototype.destroy = function () {
    window.cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.handleResize);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    if (this.prefersReducedMotion) {
      if (this.prefersReducedMotion.removeEventListener) {
        this.prefersReducedMotion.removeEventListener("change", this.handleMotionPreferenceChange);
      } else if (this.prefersReducedMotion.removeListener) {
        this.prefersReducedMotion.removeListener(this.handleMotionPreferenceChange);
      }
    }

    if (!this.gl) {
      return;
    }

    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
  };

  function init() {
    var nodes = document.querySelectorAll("[data-dither-header]");
    for (var i = 0; i < nodes.length; i += 1) {
      if (!nodes[i].__ditherHeaderInstance) {
        nodes[i].__ditherHeaderInstance = new DitherHeader(nodes[i]);
      }
    }
  }

  init();
})();
