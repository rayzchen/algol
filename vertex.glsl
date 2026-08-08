#version 300 es

in vec3 a_position;
out vec2 texCoord;

void main() {
    gl_Position = vec4(a_position, 1.0);
    texCoord = a_position.xy / 2.0 + 0.5;
}
