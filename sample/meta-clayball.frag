#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

#define noz(v) normalize(v)
#define _dot(a, b) max(0.0, dot(a, b))

vec3 hash3(vec3 uv)
{
    vec3 value = vec3(dot(uv, vec3(721.2189, 811.251, 721.21)), 
                      dot(uv, vec3(411.219, 13.11, 21.121)),
                      dot(uv, vec3(35.79, 13.51, 517.2181)));
    vec3 res = fract(sin(value) * 15259.171);
    return 2.0*res-1.0;
}

float gnoise(vec3 uv)
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
    
    vec3 x = fpos;
    vec3 t = x*x*x*(x*(x*6.-15.)+10.);
    
    float res = mix(mix(mix(a, b, t.x), mix(c, d, t.x), t.y),
                    mix(mix(e, f, t.x), mix(g, h, t.x), t.y),
                    t.z);
    return 0.5 * res + 0.5;
}

float fbm(vec3 uv)
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

//metaball density
float F(in vec3 p, in vec3 c, in float R)
{
    float r = length(p - c);
    if (r >= R)
    {
        return 0.0;
    }
    return (2.0*r*r*r / (R*R*R)) - (3.0*r*r / (R*R)) + 1.0;
}

float metaball_sdf(in vec3 p)
{
    float R = 0.9;
    float M = 3.0 / (2.0*R);
    
    float inv_density = F(p, vec3(-0.5,0,0), R);
    
    float t = uTime;
    float inv_density_sum = (F(p, vec3(-2.0*sin(t), 0.7, 0.0), R) + 
                             F(p, vec3(1.0*sin(t), 0.7, 0.0), R) + 
                             F(p, vec3(0.0, 0.7, 1.2*sin(2.0*t + 0.5)), R));
    float M_sum = 2*M;
    
    return (0.2 - inv_density_sum) / M_sum;
}

float sdf(in vec3 p)
{
    //float sin_offset = 0.025*sin(20.0*p.x)*sin(20.0*p.y)*sin(20.0*p.z);
    //return min(p.y, metaball_sdf(p));
    return min(p.y, metaball_sdf(p)) + 0.38*clamp(fbm(p), 0, 1);
}

vec3 sdf_normal(in vec3 p)
{
    float o = sdf(p);
    vec2 e = vec2(0, 0.0001);
    return noz(vec3(sdf(p + e.yxx) - o,
                    sdf(p + e.xyx) - o,
                    sdf(p + e.xxy) - o));
}

float shadow(in vec3 p, in vec3 l)
{
    float k = 64;
    float t = 0.5;
    float t_max = 20.0;
    
    float res = 1.0;
    for (int i = 0; i < 50; ++i)
    {
        float d = sdf(p + t*l);
        if (d < 0.001)
        {
            return 0.0;
        }
        res = min(res, d*k/t);
        t += d;
    }
    return res;
}

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    vec3 ro = vec3(-1,2, -3);
    vec3 at = vec3(0,0.5,0);
    vec3 cam_z = noz(at - ro);
    vec3 cam_x = noz(cross(vec3(0,1,0), cam_z));
    vec3 cam_y = noz(cross(cam_z, cam_x));
    vec3 rd = noz(uv.x * cam_x + uv.y * cam_y + 2.0 * cam_z);
    
    int matid = -1;
    int tries_taken = 0;
    float t = 0.001;
    float t_max = 11.0;
    for (int i = 0; i < 256 && t < t_max; ++i)
    {
        float d = sdf(ro + t*rd);
        if (d < 0.01)
        {
            tries_taken = i;
            matid = 0;
            break;
        }
        t += d;
    }
    
    vec3 glow = 0.8*vec3(float(tries_taken) / 256.0);
    
    vec3 background = vec3(0.0);
    vec3 col = background;
    if (matid == 0)
    {
        vec3 p = ro + t*rd;
        vec3 n = sdf_normal(p);
        vec3 l = -noz(vec3(0.5, -0.4, 0.5));
        
        float cosine = _dot(n, l);
        float shad = 0.8 * cosine * shadow(p, l) + 0.2;
        col = shad * vec3(1.0) + glow;
        col = mix(col, background, pow(t / t_max, 1.5));
    }
    
    FragColor = col;
}
