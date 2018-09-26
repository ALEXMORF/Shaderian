#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels

uniform int uFrameIndex;
uniform sampler2D uPrevFrame;

in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

float hash(vec2 uv)
{
    float value = dot(uv, vec2(7112.21, 83105.821));
    return fract(sin(value) * 92156.11);
}

void main()
{
    vec2 uv = FragCoord;
    vec2 texCoord = 0.5 * uv + 0.5;
    
    float prev_life = texture(uPrevFrame, texCoord).r;
    float alive_neighbor_count = (texture(uPrevFrame, (texCoord + vec2(1, -1) / uResolution)).r +
                                  texture(uPrevFrame, (texCoord + vec2(1, 0) / uResolution)).r +
                                  texture(uPrevFrame, (texCoord + vec2(1, 1) / uResolution)).r +
                                  texture(uPrevFrame, (texCoord + vec2(0, 1) / uResolution)).r +
                                  texture(uPrevFrame, (texCoord + vec2(0, -1) / uResolution)).r +
                                  texture(uPrevFrame, (texCoord + vec2(-1, 1) / uResolution)).r +
                                  texture(uPrevFrame, (texCoord + vec2(-1, 0) / uResolution)).r +
                                  texture(uPrevFrame, (texCoord + vec2(-1, -1) / uResolution)).r);
    
    float next_life = prev_life;
    if (prev_life == 0 && alive_neighbor_count == 3)
    {
        next_life = 1;
    }
    else if (alive_neighbor_count < 2)
    {
        next_life = 0;
    }
    else if (alive_neighbor_count > 3)
    {
        next_life = 0;
    }
    
    FragColor = vec3(next_life, 0, 0);
    
    if (uFrameIndex == 0)
    {
        if (floor(2.0 * hash(uv)) == 1)
        {
            FragColor = vec3(1, 0, 0);
        }
    }
}
