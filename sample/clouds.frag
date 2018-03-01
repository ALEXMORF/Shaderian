#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

float hash(vec2 uv)
{
    return fract(sin(dot(uv, vec2(81.381, 170.821))) * 8317.127);
}

float noise(vec2 uv)
{
    vec2 ipos = floor(uv);
    vec2 fpos = fract(uv);

    float a = hash(ipos + vec2(0.0, 0.0));
    float b = hash(ipos + vec2(1.0, 0.0));
    float c = hash(ipos + vec2(0.0, 1.0));
    float d = hash(ipos + vec2(1.0, 1.0));

    vec2 u = smoothstep(0.0, 1.0, fpos);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 uv)
{
    float result = 0.0;
    float total_weight = 0.0;

    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 6; ++i)
    {
        result += amplitude * noise(frequency * uv);
        total_weight += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    result /= total_weight; //normalize
    return result;
}

void main()
{
    vec2 uv = FragCoord;
    uv *= 5.0;

    float t = fbm(uv + fbm(uv + fbm(uv + 0.5*uTime) - 0.4*uTime) - 0.2*uTime);
    vec3 col = mix(vec3(0.2, 0.6, 0.9), vec3(0.9, 0.9, 0.9), t);
    col = sqrt(col);
    FragColor = col;
}
