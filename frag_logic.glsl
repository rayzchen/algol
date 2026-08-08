#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 screenSize;
in vec2 texCoord;
out vec4 fragColor;

void main() {
    float current = texture(uTexture, texCoord).r;
    float neighbours = texture(uTexture, texCoord + vec2(-1.0, -1.0) / screenSize).r +
        texture(uTexture, texCoord + vec2(0.0, -1.0) / screenSize).r +
        texture(uTexture, texCoord + vec2(1.0, -1.0) / screenSize).r +
        texture(uTexture, texCoord + vec2(-1.0, 0.0) / screenSize).r +
        texture(uTexture, texCoord + vec2(1.0, 0.0) / screenSize).r +
        texture(uTexture, texCoord + vec2(-1.0, 1.0) / screenSize).r +
        texture(uTexture, texCoord + vec2(0.0, 1.0) / screenSize).r +
        texture(uTexture, texCoord + vec2(1.0, 1.0) / screenSize).r;
    float pixel;
    if (current == 0.0 && neighbours == 3.0 || current == 1.0 && (neighbours == 2.0 || neighbours == 3.0)) {
        pixel = 1.0;
    } else {
        pixel = 0.0;
    }
    fragColor = vec4(pixel, 0.0, 0.0, 1.0);
}
