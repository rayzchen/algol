#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 screenSize;
uniform ivec2 mapSize;
uniform vec2 center;
uniform float scale;
uniform float rest;
uniform float color;
uniform float wrap;
out vec4 fragColor;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 branch(float cond, vec3 a, vec3 b) { return cond * a + (1.0 - cond) * b; }

void main() {
    vec2 texCoord = (gl_FragCoord.xy / scale + center) / vec2(mapSize);
    float topRight = 2.0 - step(-1.0, -texCoord.x) - step(-1.0, -texCoord.y);
    float bottomLeft = step(0.0, -texCoord.x) + step(0.0, -texCoord.y);
    float outside = min(1.0, topRight + bottomLeft) * (1.0 - wrap);
    float pixel = texture(uTexture, texCoord).r;
    vec3 hsv = vec3(mix(0.666, 0.333, pow(pixel, 2.0)), mix(0.7, 1.0, pixel), pixel);
    vec3 mixed = branch(color, hsv2rgb(hsv), vec3(1.0 - step(pixel, rest)));
    fragColor = vec4(branch(outside, vec3(0.1), mixed), 1.0);
}
