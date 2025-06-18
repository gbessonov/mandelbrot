//--- High-precision float from scalar
vec2 hp(float value) {
    return vec2(value, 0.0);
}

//--- TwoSum: accurate addition with error tracking
vec2 twoSum(float a, float b) {
    float s = a + b;
    float bb = s - a;
    float err = (a - (s - bb)) + (b - bb);
    return vec2(s, err);
}

//--- Dekker's TwoProd: accurate product with error
vec2 twoProd(float a, float b) {
    float p = a * b;
    const float splitter = 4097.0;
    float a_hi = (a * splitter) - ((a * splitter) - a);
    float a_lo = a - a_hi;
    float b_hi = (b * splitter) - ((b * splitter) - b);
    float b_lo = b - b_hi;
    float err = ((a_hi * b_hi - p) + a_hi * b_lo + a_lo * b_hi) + a_lo * b_lo;
    return vec2(p, err);
}

//--- Basic double-float arithmetic
vec2 hp_sum(vec2 a, vec2 b) {
    vec2 s = twoSum(a.x, b.x);
    float t = a.y + b.y + s.y;
    return twoSum(s.x, t);
}

vec2 hp_sub(vec2 a, vec2 b) {
    return hp_sum(a, vec2(-b.x, -b.y));
}

vec2 hp_mul(vec2 a, vec2 b) {
    vec2 p = twoProd(a.x, b.x);
    float t = a.x * b.y + a.y * b.x + p.y;
    return twoSum(p.x, t);
}

vec2 hp_div(vec2 a, float b) {
    return hp_mul(a, hp(1.0 / b));
}

vec2 hp_scale(float c, vec2 a) {
    return vec2(c * a.x, c * a.y);
}

vec2 hp_square(vec2 a) {
    return hp_mul(a, a);
}

//--- Main fragment function
void main() {
    // Convert gl_FragCoord to high-precision offset
    vec2 offset_x = twoSum(gl_FragCoord.x, -0.5 * u_resolution.x);
    vec2 offset_y = twoSum(gl_FragCoord.y, -0.5 * u_resolution.y);

    vec2 c_re = hp_div(hp_sub(offset_x, twoSum(u_center_x.x, u_center_x.y)), u_zoom);
    vec2 c_im = hp_div(hp_sub(offset_y, twoSum(u_center_y.x, u_center_y.y)), u_zoom);

    vec2 z_re = hp(0.0);
    vec2 z_im = hp(0.0);

    int maxIterations = iterationsByZoom(u_zoom);
    int iterations = 0;

    for (int i = 0; i < maxIterations; ++i) {
        vec2 z_re2 = hp_square(z_re);
        vec2 z_im2 = hp_square(z_im);
        vec2 mag2 = hp_sum(z_re2, z_im2);
        if (mag2.x > 4.0) break;

        vec2 z_re_old = z_re;
        z_re = hp_sum(hp_sub(z_re2, z_im2), c_re);
        z_im = hp_sum(hp_scale(2.0, hp_mul(z_re_old, z_im)), c_im);
        iterations++;
    }

    float t = float(iterations) / float(maxIterations);
    outColor = getColor(t);
}
