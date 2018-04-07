#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

#define Pi 3.1415926

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    float star_point_count = 5.0;
    float max_r = 0.5;
    float min_r = 0.2;
    float sa = 2.0 * Pi / star_point_count;
    
    float a = atan(uv.y, uv.x) - radians(18.0);
    float r = length(uv);
    
    float t = mod(a, sa) / sa;
    if (t > 0.5)
    {
        t = 1.0 - t;
    }
    a = t * sa;
    
    vec3 test_p = r * vec3(cos(a), sin(a), 0.0);
    
    vec3 p0 = max_r * vec3(cos(0.0), sin(0.0), 0.0);
    vec3 p1 = min_r * vec3(cos(0.5*sa), sin(0.5*sa), 0.0);
    vec3 d0 = p0 - p1;
    vec3 d1 = test_p - p1;
    float within_star = 1.0-smoothstep(-0.001, 0.0, cross(d0, d1).z);
    
    vec3 star_color = vec3(0.8, 0.7, 0.2);
    vec3 background_color = vec3(0.2, 0.4, 0.6);
    FragColor = mix(background_color, star_color, within_star);
}