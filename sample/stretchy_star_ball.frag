#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

#define Pi 3.1415926

float sdf(vec3 p)
{
    p.y *= 1.2 + 0.5*sin(uTime);
    float sdf_sphere = length(p - vec3(0,0,3)) - 1.2;
    return sdf_sphere;
}

vec3 gradient(vec3 p)
{
    vec2 e = vec2(0.0, 0.001);
    return normalize(vec3(sdf(p + e.yxx) - sdf(p),
                          sdf(p + e.xyx) - sdf(p),
                          sdf(p + e.xxy) - sdf(p)));
}

vec3 sphere_tex(vec3 p, vec3 dpdx, vec3 dpdy)
{
    vec3 v = normalize(p - vec3(0,0,3));
    vec2 uv = vec2(v.x, v.y) + vec2(0.2, -0.2);
    
    float max_r = 0.5;
    float min_r = 0.2;
    float max_a = 2.0 * Pi / 5.0;
    
    float a = atan(uv.y, uv.x);
    float r = length(uv);
    
    a = mod(a, max_a);
    if (a >= 0.5*max_a)
    {
        a = max_a - a;
    }
    
    vec3 p0 = min_r * vec3(cos(0.5*max_a), sin(0.5*max_a), 0);
    vec3 p1 = max_r * vec3(cos(0.0), sin(0.0), 0);
    vec3 uv_p = r * vec3(cos(a), sin(a), 0);
    
    vec3 crs = cross(p1 - p0, uv_p - p0);
    float t = smoothstep(0.0, 0.002, crs.z);
    
    vec3 star_col = vec3(1, 1, 0);
    vec3 background = vec3(0.3, 0.4, 0.6);
    return mix(star_col, background, t);
}

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    vec3 ro = vec3(0);
    vec3 rd = normalize(vec3(uv,2.0) - ro);
    
    bool hit = false;
    float t = 0.001;
    float t_max = 50.0;
    for (int i = 0; i < 300 && t < t_max; ++i)
    {
        float d = sdf(ro + t*rd);
        if (d < 0.001)
        {
            hit = true;
            break;
        }
        t += d;
    }
    
    vec3 background = vec3(0.6, 0.7, 0.8);
    vec3 p = ro + t*rd;
    vec3 dpdx = dFdx(p);
    vec3 dpdy = dFdy(p);
    if (hit)
    {
        vec3 normal = gradient(p);
        vec3 l = normalize(vec3(1.0, -0.5, 0.5));
        
        float cosine = dot(normal, -l);
        float wrap_cosine = 0.25 * pow(dot(normal, -l) + 1.0, 2.0);
        
        vec3 mat = sphere_tex(p, dpdx, dpdy);
        vec3 shad = 0.9 * (wrap_cosine * mat) + 0.1 * mat;
        FragColor = mix(shad, background, pow(t / t_max, 2.0));
    }
    else
    {
        FragColor = background;
    }
}
