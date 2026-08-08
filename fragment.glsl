#version 300 es
precision highp float;

uniform sampler2D u_texture;
in vec2 texCoord;
out vec4 fragColor;

void main() {
    fragColor = vec4(texture(u_texture, texCoord).rrr, 1.0);
}
