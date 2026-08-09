#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform float rest;
uniform float decay;
out vec4 fragColor;

void main() {
    ivec2 pos = ivec2(gl_FragCoord.xy);
    float current = texelFetch(uTexture, pos, 0).r;
    float neighbours = 0.0;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            float pixel = texelFetch(uTexture, pos + ivec2(i, j), 0).r;
            if (pixel >= rest) {
                neighbours += 1.0;
            }
        }
    }

    float outPixel;
    if (current < rest) {
        if (neighbours == 3.0) {
            outPixel = 1.0;
        } else {
            outPixel = current * 0.98 - 0.002;
        }
    } else {
        if (neighbours == 3.0 || neighbours == 4.0) {
            outPixel = current * 0.98 - 0.002;
            if (outPixel < rest) {
                outPixel = rest;
            }
        } else {
            outPixel = rest * 0.6;
        }
    }
    fragColor = vec4(outPixel, 0.0, 0.0, 1.0);
}
