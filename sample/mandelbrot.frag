#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

vec2 complex_pow(vec2 x, int exp)
{
    vec2 res = x;
    for (int i = 1; i < exp; ++i)
    {
        res = vec2(res.x*res.x - res.y*res.y, 2.0*res.x*res.y);
    }
    return res;
}

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    vec2 c = uv + vec2(0, 0);
    
    vec2 z = vec2(0);
    int iter_max = 100;
    int iter = 0;
    for (iter = 0; iter < iter_max; ++iter)
    {
        z = complex_pow(z, 2) + c;
        if (length(z) > 2.0) 
        {
            break;
        }
    }
    
    float col = float(iter) / float(iter_max);
    FragColor = vec3(col);
}
