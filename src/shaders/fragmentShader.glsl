#version 300 es

precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_center_high;
uniform vec2 u_center_low;
uniform float u_zoom;

out vec4 outColor;

float hp(float value) {
    return value;
}

float hp_sum(float a, float b) {
    return a + b;
}

float hp_sub(float a, float b) {
    return a - b;
}

float hp_mul(float a, float b) {
    return a * b;
}

float hp_scale(float k, float value) {
    return k * value;
}

float hp_square(float a) {
    return a * a;
}

vec4 getColor(float t) {
    if (t > 0.9999999) return vec4(0.1, 0.1, 0.1, 1.0);
    vec3 a = vec3(0.1, 0.1, 0.3);
    vec3 b = vec3(0.9, 0.9, 0.7) * pow((1.0 - t), 3.0);
    return vec4(a + b, 1.0);
}

void main() {
    vec2 c = (gl_FragCoord.xy - 0.5 * u_resolution - u_center_high - u_center_low) / u_zoom;

    float c_re = c.x;
    float c_im = c.y;

    float z_re = 0.0;
    float z_im = 0.0;

    const int maxIterations = 200;
    int iterations = 0;
    for (int i = 0; i < maxIterations; i++) {
        float z_re2 = hp_square(z_re);
        float z_im2 = hp_square(z_im);
        if ((z_re2 + z_im2) > 4.0) {
            break;
        }
        float z_re_old = z_re;
        z_re = hp_sum(hp_sub(z_re2, z_im2), c_re);
        z_im = hp_sum(hp_scale(2.0, hp_mul(z_re_old, z_im)), c_im);
        iterations++;
    }

    float t = float(iterations) / float(maxIterations);
    outColor = getColor(t);
}