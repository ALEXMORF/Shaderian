#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    vec2 BrickDim = vec2(0.50, 0.16);
    vec2 MotarThickness = vec2(0.02);
    
    uv /= BrickDim;
    if (mod(floor(uv).y, 2.0) != 0.0)
    {
        uv.x += BrickDim.x;
    }
    
    vec2 ipos = floor(uv);
    vec2 fpos = fract(uv);
    
    vec2 Motar = 0.5 * MotarThickness / BrickDim;
    vec2 IsBrick = step(Motar, fpos) - step(1.0 - Motar, fpos);
    
    vec3 MotarColor = vec3(0.7, 0.7, 0.7);
    vec3 BrickColor = vec3(0.8, 0.4, 0.4);
    FragColor = mix(MotarColor, BrickColor, IsBrick.x * IsBrick.y);
}