#version 300 es

precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;

out vec4 outColor;

vec4 getColor(float t) {
    if (t > 0.9999999) return vec4(0.1, 0.1, 0.1, 1.0);
    vec3 a = vec3(0.1, 0.1, 0.3);
    vec3 b = vec3(0.9, 0.9, 0.7) * pow((1.0 - t), 3.0);
    return vec4(a + b, 1.0);
}

void main() {
    vec2 c = (gl_FragCoord.xy - 0.5 * u_resolution - u_center) / u_zoom;
    vec2 z = vec2(0.0);
    const int maxIterations = 200;
    int iterations = 0;
    for (int i = 0; i < maxIterations; i++) {
        if (dot(z, z) > 4.0) break;
        z = vec2(
        z.x * z.x - z.y * z.y + c.x,
        2.0 * z.x * z.y + c.y
        );
        iterations++;
    }
    float t = float(iterations) / float(maxIterations);
    outColor = getColor(t);
}