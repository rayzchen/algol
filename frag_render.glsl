#version 300 es
precision highp float;

uniform sampler2D uTexture;
in vec2 texCoord;
out vec4 fragColor;

void main() {
    fragColor = vec4(texture(uTexture, texCoord).rrr, 1.0);
}
