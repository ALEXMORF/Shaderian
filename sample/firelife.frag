#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

void main()
{
    float t = uTime;
    
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    float freq = 0.7;
    float osci = pow(sin(freq*t), 2.0);
    float period = (1.0 / freq) * 3.1415926; 
    float soul_count = min(150, 1 + floor(t / period));
    
    float col = 0.0;
    for (float i = 0; i < soul_count; i += 1.0)
    {
        vec2 p = osci * vec2(sin(i*0.23 + 1.7*t) + cos(i*1.32 + 1.6*t), sin(i*2.1 + 0.21*t) + cos(i*1.5 + 1.5*t));
        
        float d = length(p - uv);
        col += 0.0003 / (max(pow(osci, 0.2), 0.01) * pow(d, 1.6));
    }
    
    vec3 background = vec3(0.2, 0.0, 0.0);
    vec3 dot_col = vec3(0.8, 0.5, 0.2);
    vec3 free_col = vec3(0.8, 0.5, 0.2);
    vec3 breed_col = vec3(0.2, 0.8, 0.5);
    FragColor = mix(background, mix(breed_col, free_col, pow(osci, 0.2)), col);
}
