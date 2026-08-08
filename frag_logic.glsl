#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform float rest;
uniform float decay;
uniform vec2 screenSize;
in vec2 texCoord;
out vec4 fragColor;

void main() {
    float current = texture(uTexture, texCoord).r;
    float neighbours = 0.0;
    for (float i = -1.0; i <= 1.0; i++) {
        for (float j = -1.0; j <= 1.0; j++) {
            float pixel = texture(uTexture, texCoord + vec2(i, j) / screenSize).r;
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
