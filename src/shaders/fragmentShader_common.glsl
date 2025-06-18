#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_center_x;
uniform vec2 u_center_y;
uniform float u_zoom;

out vec4 outColor;

//--- Color mapping
vec4 getColor(float t) {
    if (t > 0.9999999) return vec4(0.1, 0.1, 0.1, 1.0);
    vec3 a = vec3(0.1, 0.1, 0.3);
    vec3 b = vec3(0.9, 0.9, 0.7) * pow((1.0 - t), 3.0);
    return vec4(a + b, 1.0);
}

int iterationsByZoom(float zoom) {
    int maxIterations = 50 * (int(log(zoom)) + 1);
    if (maxIterations > 1000) {
        maxIterations = 1000;
    }
    return maxIterations;
}