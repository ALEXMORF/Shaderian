#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

#define noz(value) normalize(value)
#define _dot(a, b) max(0, dot(a, b))

vec2 hash2(vec2 uv)
{
    vec2 v = vec2(dot(uv, vec2(21921.11, 71.821)),
                  dot(uv, vec2(17.281, 8211.217)));
    return 2.0 * fract(sin(v)*9211.211) - 1.0;
}

float gnoise(vec2 uv)
{
    vec2 fpos = fract(uv);
    vec2 ipos = floor(uv);
    
    float a = dot(hash2(ipos + vec2(0, 0)), fpos - vec2(0, 0));
    float b = dot(hash2(ipos + vec2(1, 0)), fpos - vec2(1, 0));
    float c = dot(hash2(ipos + vec2(0, 1)), fpos - vec2(0, 1));
    float d = dot(hash2(ipos + vec2(1, 1)), fpos - vec2(1, 1));
    
    vec2 t = smoothstep(0, 1, fpos);
    
    return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}

float fbm(vec2 uv)
{
    float res = 0.0;
    float amp = 0.5;
    float freq = 2.0;
    for (int i = 0; i < 6; ++i)
    {
        res += amp*gnoise(freq*uv);
        amp *= 0.5;
        freq *= 2.0;
    }
    return res;
}

vec3 hash3(vec3 uv)
{
    vec3 v = vec3(dot(uv, vec3(21921.11, 71.821, 11.281)),
                  dot(uv, vec3(17.281, 8211.217, 21.51)),
                  dot(uv, vec3(821.11, 827.219, 8211.11)));
    return 2.0 * fract(sin(v)*9211.211) - 1.0;
}

float gnoise3(vec3 uv)
{
    vec3 fpos = fract(uv);
    vec3 ipos = floor(uv);
    
    float a = dot(hash3(ipos + vec3(0, 0, 0)), fpos - vec3(0, 0, 0));
    float b = dot(hash3(ipos + vec3(1, 0, 0)), fpos - vec3(1, 0, 0));
    float c = dot(hash3(ipos + vec3(0, 1, 0)), fpos - vec3(0, 1, 0));
    float d = dot(hash3(ipos + vec3(1, 1, 0)), fpos - vec3(1, 1, 0));
    float e = dot(hash3(ipos + vec3(0, 0, 1)), fpos - vec3(0, 0, 1));
    float f = dot(hash3(ipos + vec3(1, 0, 1)), fpos - vec3(1, 0, 1));
    float g = dot(hash3(ipos + vec3(0, 1, 1)), fpos - vec3(0, 1, 1));
    float h = dot(hash3(ipos + vec3(1, 1, 1)), fpos - vec3(1, 1, 1));
    
    vec3 t = smoothstep(0, 1, fpos);
    
    return mix(mix(mix(a, b, t.x), mix(c, d, t.x), t.y),
               mix(mix(e, f, t.x), mix(g, h, t.x), t.y), t.z);
}

float fbm3(vec3 uv)
{
    float res = 0.0;
    float amp = 0.5;
    float freq = 2.0;
    for (int i = 0; i < 6; ++i)
    {
        res += amp*gnoise3(freq*uv);
        amp *= 0.5;
        freq *= 2.0;
    }
    return res;
}

float sdf(in vec3 p, in float t)
{
    return length(p) - 1.0*(t+0.2) + 0.8*fbm3(p);
}

vec3 sdf_normal(in vec3 p, in float t)
{
    vec2 e = vec2(0, 0.001);
    return noz(vec3(sdf(p + e.yxx, t), sdf(p + e.xyx, t), sdf(p + e.xxy, t)) - sdf(p, t));
}

float pump_t(in vec3 p)
{
    float res = 0.4*(1.0*sin(uTime + p.y)+2.0);
    return res;
}

float shadow(in vec3 p, in vec3 l)
{
    float t = 0.4;
    float t_max = 2.0;
    while (t < t_max)
    {
        float d = sdf(p + t*l, pump_t(p + t*l));
        if (d < 0.0001)
        {
            //return 1.0;
            return 0.0;
        }
        t += d;
    }
    return 1.0;
}

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    vec3 ro = vec3(0, 0, -4);
    vec3 at = vec3(0, 0, 0);
    vec3 cam_z = noz(at - ro);
    vec3 cam_x = noz(cross(vec3(0,1,0), cam_z));
    vec3 cam_y = noz(cross(cam_z, cam_x));
    vec3 rd = noz(cam_x * uv.x + cam_y * uv.y + 2.0 * cam_z);
    
    //raymarch begins!!!
    float t_min = 0.001;
    float t_max = 50.0;
    float t = t_min;
    int matid = -1;
    for (int i = 0; i < 256 && t < t_max; ++i)
    {
        vec3 p = ro + t*rd;
        float d = sdf(p, pump_t(p));
        if (d < t_min)
        {
            matid = 0;
            break;
        }
        t += d;
    }
    
    vec3 p = ro + t*rd;
    
    vec3 col = vec3(0.1);
    if (matid != -1)
    {
        vec3 n = sdf_normal(p, pump_t(p));
        vec3 l = -noz(vec3(0.5, -0.5, 0.5));
        
        float shad = 0.2 + shadow(p, l) * 0.8 * _dot(n, l);
        col = shad * vec3(0.5, 0.1, 0.1);
    }
    
    FragColor = sqrt(col);
}
