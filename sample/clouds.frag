#version 330 core

uniform float uTime;
uniform vec2 uResolution;
in vec2 FragCoord;
out vec3 FragColor;

float random(float x)
{
    return fract(sin(x) * 8384.831);
}

float random(vec2 uv)
{
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.553);
}

vec2 random2(vec2 uv)
{
    vec2 result = vec2(fract(sin(dot(uv, vec2(12.9898, 78.233))) * 3758.553),
                       fract(sin(dot(uv, vec2(841.3183, 13.391))) * 8381.94));
    result = 2.0 * result - 1.0;
    return result;
}

float noise(float x)
{
    float i = floor(x);
    float f = fract(x);
    return mix(random(i), random(i + 1.0), smoothstep(0.0, 1.0, f));
}

float noise2d(vec2 uv)
{
    vec2 ipos = floor(uv);
    vec2 fpos = fract(uv);

    float a = random(ipos + vec2(0.0, 0.0));
    float b = random(ipos + vec2(1.0, 0.0));
    float c = random(ipos + vec2(0.0, 1.0));
    float d = random(ipos + vec2(1.0, 1.0));

    vec2 u = fpos * fpos * (3.0 - 2.0 * fpos);

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 uv)
{
    float value = 0.0;
    float amp = 0.5;
    float freq = 1.0;

    for (int i = 0; i < 6; ++i)
    {
        value += amp * noise2d(freq * uv);
        freq *= 2.4;
        amp *= 0.5;
    }

    return value;
}

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    uv *= 5.0;

    float flow_speed = -0.25;
    float exp = 0.25;
    float t = clamp(fbm(uv + fbm(uv + vec2(flow_speed*uTime))), 0.0, 1.0);
    vec3 col = mix(vec3(0.0, 0.6, 0.9), vec3(0.9, 0.9, 0.9), pow(t, exp));
    FragColor = sqrt(col);
}
