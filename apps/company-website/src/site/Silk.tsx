import { useEffect, useRef } from "react";

// Flowing red silk drawn with a WebGL fragment shader — our own take on a fabric-gradient
// background. Pauses when off screen, renders one still frame for reduced motion, and falls
// back to the CSS gradient on the wrapper when WebGL is unavailable.

const vert = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const frag = `
precision mediump float;
uniform vec2 res;
uniform float t;

float fold(vec2 uv, float s) {
  float a = sin(uv.x * 2.1 + uv.y * 1.3 + s * 0.55);
  float b = sin(uv.x * -1.4 + uv.y * 2.6 - s * 0.4 + a * 1.2);
  float c = sin((uv.x + uv.y) * 1.7 + s * 0.3 + b * 1.4);
  return a * 0.35 + b * 0.4 + c * 0.25;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y * 1.6;
  float s = t * 0.35;
  // Domain warp so the folds bend like fabric.
  vec2 w = uv + 0.45 * vec2(sin(uv.y * 1.8 + s), cos(uv.x * 1.5 - s * 0.8));
  float f = fold(w, s);
  float e = 0.004;
  float gx = fold(w + vec2(e, 0.0), s) - f;
  float gy = fold(w + vec2(0.0, e), s) - f;
  vec3 n = normalize(vec3(-gx / e, -gy / e, 2.2));
  float light = clamp(dot(n, normalize(vec3(-0.5, 0.6, 0.65))), 0.0, 1.0);
  float sheen = pow(light, 9.0);

  vec3 deep = vec3(0.30, 0.0, 0.04);
  vec3 brand = vec3(0.86, 0.0, 0.13);
  vec3 bright = vec3(1.0, 0.36, 0.42);
  vec3 col = mix(deep, brand, smoothstep(0.15, 0.85, light));
  col = mix(col, bright, sheen * 0.55);
  // Darken towards the bottom-right corner, like a studio-lit cloth.
  col *= 1.0 - 0.35 * smoothstep(0.2, 1.6, length(uv - vec2(-0.6, 0.5)));
  gl_FragColor = vec4(col, 1.0);
}`;

export function Silk({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!canvas || !gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "res");
    const uT = gl.getUniformLocation(prog, "t");

    // Half resolution is plenty for soft folds and keeps the GPU cost low.
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio, 2) * 0.5;
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = false;
    const start = performance.now();
    const draw = (now: number) => {
      gl.uniform1f(uT, (now - start) / 1000 + 4);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (visible && !still) raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(draw);
    });
    io.observe(canvas);
    canvas.style.opacity = "1";

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <div className={`silk-fallback absolute inset-0 ${className}`} aria-hidden>
      <canvas ref={ref} className="h-full w-full opacity-0 transition-opacity duration-700" />
    </div>
  );
}
