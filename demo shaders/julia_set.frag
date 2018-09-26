#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels

uniform int uFrameIndex;
uniform sampler2D uPrevFrame;
uniform sampler2D GraceCathedral;
uniform sampler2D Glacier;
uniform sampler2D UffiziGallery;
uniform sampler2D EnnisDiningRoom;
uniform sampler2D PisaCourtyard;
uniform sampler2D DogeCourtyard;

in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

vec2 spherical_sample(in vec3 rd)
{
    rd = normalize(rd);
    const vec2 invAtan = vec2(0.1591, 0.3183);
    vec2 uv = vec2(atan(rd.z, rd.x), asin(rd.y));
    uv *= invAtan;
    uv += 0.5;
    return uv;
}

#define noz(v) normalize(v)
#define _dot(a, b) max(0, dot(a, b))
#define pi 3.1415926

vec4 q_mul(in vec4 a, in vec4 b)
{
    vec4 res;
    res.w = a.w*b.w - a.x*b.x - a.y*b.y - a.z*a.z;
    res.x = a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y;
    res.y = a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x;
    res.z = a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w;
    return res;
}

mat2 rotate2d(in float a)
{
    float s = sin(a);
    float c = cos(a);
    return mat2(c, s, -s, c);
}

float de_julia_set(in vec3 p, out float t)
{
    vec4 c = vec4(0.0, 0.3, 0.8, 0.0);
    
    vec4 z = vec4(0, p);
    float dz = 1;
    for (int i = 0; i < 8; ++i)
    {
        dz = 2.0 * length(z) * dz;
        z.xy *= rotate2d(3.14);
        z = q_mul(z, z) + c;
        if (length(z) > 256)
        {
            break;
        }
    }
    
    t = length(z) / 256.0;
    return 0.5 * length(z) * log(length(z)) / dz;
}

float de_mandelbrot(in vec3 p, out float t)
{
    vec4 c = vec4(0, p);
    
    vec4 z = vec4(0);
    float dz = 0;
    for (int i = 0; i < 15; ++i)
    {
        dz = 2.0 * length(z) * dz + 1;
        //z.xy *= rotate2d(pi);
        z = q_mul(z, z) + c;
        if (length(z) > 256)
        {
            break;
        }
    }
    
    t = length(z) / 256.0;
    return 0.50 * length(z) * log(length(z)) / dz;
}

float map(in vec3 p, out float t)
{
    float julia = de_julia_set(p - vec3(0, 1.5, 0), t);
    float sphere = length(p - vec3(0, 1.5, 0)) - 1.0;
    return julia;
}

vec3 map_n(in vec3 p)
{
    vec2 e = vec2(0, 0.00001);
    float garbage;
    return noz(vec3(map(p + e.yxx, garbage), map(p + e.xyx, garbage), map(p + e.xxy, garbage)) - map(p, garbage));
}

float shadow(in vec3 p, in vec3 l)
{
    float k = 256.0;
    float res = 1.0;
    
    float t = 0.01;
    float t_max = 20.0;
    for (int i = 0; i < 256 && t < t_max; ++i)
    {
        float garbage;
        float d = map(p + t*l, garbage);
        if (d < 0.001)
        {
            return 0.0;
        }
        res = min(res, d * k / t);
        t += d;
    }
    return res;
}

vec3 sample_env(vec3 rd)
{
    rd = normalize(rd);
    const vec2 invAtan = vec2(0.1591, 0.3183);
    vec2 uv = vec2(atan(rd.z, rd.x), asin(rd.y));
    uv *= invAtan;
    uv += 0.5;
    
    return texture(GraceCathedral, uv).rgb;
}

vec3 render(in vec2 uv)
{
    float time = 2.2;
    time = 0.3*uTime;
    float r = 3.0;
    vec3 ro = vec3(r * cos(time), 2, -r * sin(time));
    vec3 at = vec3(0, 1.5, 0);
    vec3 cam_z = noz(at - ro);
    vec3 cam_x = noz(cross(vec3(0, 1, 0), cam_z));
    vec3 cam_y = noz(cross(cam_z, cam_x));
    vec3 rd = noz(cam_x * uv.x + cam_y * uv.y + 2 * cam_z);
    
    float iter = 0;
    float iter_max = 256.0;
    float julia_t = -1.0;
    float t = 0.001;
    float t_max = 20.0;
    for (int i = 0; i < int(iter_max) && t < t_max; ++i)
    {
        float curr_julia_t;
        float d = map(ro + t*rd, curr_julia_t);
        if (d < 0.001)
        {
            julia_t = curr_julia_t;
            iter = float(i);
            break;
        }
        t += d;
    }
    
    float occ = 1 - (iter / iter_max);
    
    vec3 p = ro + t*rd;
    vec3 background = sample_env(rd);
    vec3 col = background;
    if (julia_t != -1.0)
    {
        vec3 n = map_n(p);
        vec3 v = normalize(p - ro);
        vec3 l = reflect(v, n);
        
        vec3 reflection = sample_env(l);
        vec3 F0 = vec3(1.0, 0.734, 0.344);
        vec3 fresnel = F0 + (vec3(1.0) - F0) * pow(1.0 - max(0.0, dot(-v,n)), 5.0);
        vec3 radiance = reflection * fresnel;
        col = occ * radiance;
    }
    
    return col;
}

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    vec2 _w = max(dFdx(uv), dFdy(uv));
    float w = 0.5 * max(_w.x, _w.y);
    
#define AA 1
    vec3 col = vec3(0);
    for (int y = 0; y < AA; ++y)
    {
        for (int x = 0; x < AA; ++x)
        {
            vec2 offset = vec2(x, y) - 0.5*vec2(AA);
            col += render(uv + offset * w);
        }
    }
    col /= AA*AA;
    
    col = 1.0-exp(-col);
    col = sqrt(col);
    FragColor = col;
}
