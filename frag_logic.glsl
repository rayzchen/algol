#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform ivec2 mapSize;
uniform float rest;
uniform float decay;
out vec4 fragColor;

int when_eq(int x, int y) { return 1 - abs(sign(x - y)); }
int branch(int cond, int a, int b) { return cond * a + (1 - cond) * b; }

float when_eq(float x, float y) { return 1.0 - abs(sign(x - y)); }
float when_lt(float x, float y) { return max(sign(y - x), 0.0); }
float branch(float cond, float a, float b) { return cond * a + (1.0 - cond) * b; }
float or(float a, float b) { return min(a + b, 1.0); }

void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    float current = texelFetch(uTexture, p, 0).r;
    float neighbours = 0.0;

    int xn = branch(when_eq(p.x, 0), mapSize.x - 1, p.x - 1);
    int yn = branch(when_eq(p.y, 0), mapSize.y - 1, p.y - 1);
    int xp = branch(when_eq(p.x, mapSize.x - 1), 0, p.x + 1);
    int yp = branch(when_eq(p.y, mapSize.y - 1), 0, p.y + 1);

    neighbours += float(texelFetch(uTexture, ivec2(xn, yn), 0).r >= rest);
    neighbours += float(texelFetch(uTexture, ivec2(p.x, yn), 0).r >= rest);
    neighbours += float(texelFetch(uTexture, ivec2(xp, yn), 0).r >= rest);

    neighbours += float(texelFetch(uTexture, ivec2(xn, p.y), 0).r >= rest);
    neighbours += float(texelFetch(uTexture, ivec2(xp, p.y), 0).r >= rest);

    neighbours += float(texelFetch(uTexture, ivec2(xn, yp), 0).r >= rest);
    neighbours += float(texelFetch(uTexture, ivec2(p.x, yp), 0).r >= rest);
    neighbours += float(texelFetch(uTexture, ivec2(xp, yp), 0).r >= rest);

    float cond2 = when_eq(neighbours, 2.0);
    float cond3 = when_eq(neighbours, 3.0);
    float pixel1 = branch(when_eq(neighbours, 3.0), 1.0, current * 0.98 - 0.002);
    float pixel2 = branch(or(cond2, cond3), max(current * 0.98 - 0.002, rest), rest * 0.6);
    float outPixel = branch(when_lt(current, rest), pixel1, pixel2);
    fragColor = vec4(outPixel, 0.0, 0.0, 1.0);
}
