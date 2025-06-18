void main() {
    float offset_x = gl_FragCoord.x - 0.5 * u_resolution.x;
    float offset_y = gl_FragCoord.y - 0.5 * u_resolution.y;

    float c_re = (offset_x - u_center_x.x - u_center_x.y) / u_zoom;
    float c_im = (offset_y - u_center_y.x - u_center_y.y) / u_zoom;

    float z_re = 0.0;
    float z_im = 0.0;

    int maxIterations = iterationsByZoom(u_zoom);
    int iterations = 0;

    for (int i = 0; i < maxIterations; ++i) {
        float z_re2 = z_re * z_re;
        float z_im2 = z_im * z_im;
        float mag2 = z_re2 + z_im2;
        if (mag2 > 4.0) break;

        float z_re_old = z_re;
        z_re = z_re2 - z_im2 + c_re;
        z_im = 2.0 * z_re_old * z_im + c_im;
        iterations++;
    }

    float t = float(iterations) / float(maxIterations);
    outColor = getColor(t);
}
