#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 screenSize;
uniform float rest;
out vec4 fragColor;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    float pixel = texture(uTexture, gl_FragCoord.xy / screenSize).r;
    vec3 hsv = vec3(mix(0.666, 0.333, pow(pixel, 2.0)), mix(0.7, 1.0, pixel), pixel);
    fragColor = vec4(hsv2rgb(hsv), 1.0);
}
