#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

float BumpHeight(vec2 uv, vec2 Motar)
{
    vec2 Height = smoothstep(vec2(0.0), Motar, uv) - smoothstep(vec2(1.0) - Motar, vec2(1.0), uv);
    return Height.x * Height.y;
}

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    vec2 BrickDim = vec2(1.40, 0.46);
    vec2 MotarThickness = vec2(0.08);
    
    uv /= BrickDim;
    if (mod(floor(uv).y, 2.0) != 0.0)
    {
        uv.x += BrickDim.x;
    }
    
    vec2 ipos = floor(uv);
    vec2 fpos = fract(uv);
    
    vec2 Motar = 0.5 * MotarThickness / BrickDim;
    vec2 IsBrick = step(Motar, fpos) - step(1.0 - Motar, fpos);
    
    float Delta = 0.0000001f;
    vec3 UpPoint = vec3(fpos + vec2(0.0, Delta), -BumpHeight(fpos + vec2(0.0, Delta), Motar));
    vec3 RightPoint = vec3(fpos + vec2(Delta, 0.0), -BumpHeight(fpos + vec2(Delta, 0.0), Motar));
    
    vec3 CurrPoint = vec3(fpos, -BumpHeight(fpos, Motar));
    vec3 dY = UpPoint - CurrPoint;
    vec3 dX = RightPoint - CurrPoint;
    vec3 N = normalize(cross(dY, dX));
    
    vec3 L = normalize(vec3(0.2, -0.1, 1.0));
    vec3 MotarColor = vec3(1.7, 1.7, 1.7);
    vec3 BrickColor = vec3(0.8, 0.4, 0.4);
    FragColor = max(0.0, dot(-L, N)) * mix(MotarColor, BrickColor, IsBrick.x * IsBrick.y);
}