#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 screenSize;
uniform ivec2 mapSize;
uniform vec2 center;
uniform float scale;
uniform float rest;
uniform float color;
out vec4 fragColor;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec2 texCoord = (gl_FragCoord.xy / scale - center) / vec2(mapSize);
    float pixel = texture(uTexture, texCoord).r;
    vec3 hsv = vec3(mix(0.666, 0.333, pow(pixel, 2.0)), mix(0.7, 1.0, pixel), pixel);
    vec3 mixed = color * hsv2rgb(hsv) + (1.0 - color) * vec3(pixel >= rest);
    fragColor = vec4(mixed, 1.0);
}
