#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels

uniform int uFrameIndex;
uniform sampler2D uPrevFrame;

in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

float hash(in float entropy)
{
    return fract(sin(entropy*821.91)*951.51);
}

float hash3(in vec3 entropy)
{
    return hash(3.7*entropy.x + 721.5*entropy.y + 18.91*entropy.z + 0.5);
}

float noise(in vec3 p)
{
    vec3 ipos = floor(p);
    vec3 fpos = fract(p);
    
    float a = hash3(ipos + vec3(0, 0, 0));
    float b = hash3(ipos + vec3(1, 0, 0));
    float c = hash3(ipos + vec3(0, 1, 0));
    float d = hash3(ipos + vec3(1, 1, 0));
    
    float e = hash3(ipos + vec3(0, 0, 1));
    float f = hash3(ipos + vec3(1, 0, 1));
    float g = hash3(ipos + vec3(0, 1, 1));
    float h = hash3(ipos + vec3(1, 1, 1));
    
    vec3 t = smoothstep(0, 1, fpos);
    
    return mix(mix(mix(a, b, t.x), mix(c, d, t.x), t.y),
               mix(mix(e, f, t.x), mix(g, h, t.x), t.y),
               t.z);
}

float fbm(in vec3 p)
{
    float res = 0;
    float amp = 0.5;
    float freq = 2.0;
    for (int i = 0; i < 5; ++i)
    {
        res += amp*noise(freq*p);
        amp *= 0.5;
        freq *= 2.0;
    }
    return res;
}

float map(in vec3 p, out int id)
{
    float sphere = length(p - vec3(0, 1, 0)) - 1;
    float floor = p.y;
    float d = min(sphere, floor);
    
    if (d == floor)
    {
        id = 0;
    }
    if (d == sphere)
    {
        id = 1;
    }
    
    return d;
}

vec3 map_n(in vec3 p)
{
    vec2 e = vec2(0, 0.001);
    int garbage;
    return normalize(vec3(map(p + e.yxx, garbage), map(p + e.xyx, garbage), map(p + e.xxy, garbage)) - map(p, garbage));
}

float shadow(in vec3 p, in vec3 l)
{
    float res = 1;
    float k = 2;
    
    float t = 0.1;
    float t_max = 50;
    while (t < t_max)
    {
        int garbage;
        float d = map(p + t*l, garbage);
        if (d < 0.001)
        {
            return 0.0;
        }
        res = min(res, d*k/t);
        t += d;
    }
    
    return res;
}

float chiGGX(float v)
{
    return v > 0 ? 1. : 0.;
}

float GGX_Distribution(vec3 n, vec3 h, float alpha)
{
    float NoH = dot(n,h);
    float alpha2 = alpha * alpha;
    float NoH2 = NoH * NoH;
    float den = NoH2 * alpha2 + (1 - NoH2);
    return (chiGGX(NoH) * alpha2) / ( 3.1415926 * den * den );
}

float floor_tex(in vec3 p)
{
    vec3 _p = p;
    _p.x = fbm(p);
    _p.z = fbm(p);
    return fbm(_p * vec3(6, 1.0, 0.3));
}

vec3 render(in vec2 uv)
{
    float time = 0.1*uTime;
    
    vec3 at = vec3(0, 1, 0);
    vec3 ro = vec3(4*sin(time), 2, -4*cos(time));
    vec3 cam_z = normalize(at - ro);
    vec3 cam_x = normalize(cross(vec3(0,1,0), cam_z));
    vec3 cam_y = cross(cam_z, cam_x); //NOTE(chen): shouldn't need normalization
    vec3 rd = normalize(cam_x * uv.x + cam_y * uv.y + 2 * cam_z);
    
    int id = -1;
    float t_max = 50;
    float t = 0.001;
    for (int i = 0; i < 256 && t < t_max; ++i)
    {
        int curr_id;
        float d = map(ro + t*rd, curr_id);
        if (d < 0.001)
        {
            id = curr_id;
            break;
        }
        t += d;
    }
    
    vec3 sun_color = vec3(2);
    vec3 background = vec3(1.4, 1.6, 1.9);
    vec3 p = ro + t*rd;
    vec3 dpdx = dFdx(p);
    vec3 dpdy = dFdy(p);
    vec3 col = background;
    if (id != -1)
    {
        vec3 l = -normalize(vec3(0.5, -0.9, 0.5));
        
        vec3 n = map_n(p);
        
        vec3 shad = vec3(0);
        
        float ao = 1;
        if (id == 0)
        {
            float t = length(p);
            ao = smoothstep(0.0, 1.5, t);
        }
        else if (id == 1)
        {
            ao = 0.5 * (dot(n, vec3(0,1,0)) + 1);
        }
        
        float roughness;
        if (id == 0)
        {
            roughness = 0.15;
        }
        else if (id == 1)
        {
            roughness = 0.6;
        }
        
        //ambient
        shad += 0.3 * ao * background;
        
        //sun reflection
        {
            vec3 v = normalize(ro - p);
            vec3 h = normalize(l + v);
            float R0 = 1 - roughness;
            float fresnel = R0 + (1 - R0) * pow(1 - dot(v, n), 5);
            float diff = (1 - fresnel) * max(0, dot(n, l));
            float spec = fresnel * GGX_Distribution(n, h, roughness);
            shad += 0.7 * shadow(p, l) * (diff + spec) * sun_color;
        }
        
        float t = 1.0;
        if (id == 0)
        {
            t = floor_tex(p);
        }
        else if (id == 1)
        {
            t = fbm(p * vec3(6.9, 0.2, 1.5));
        }
        
        vec3 color;
        if (id == 0)
        {
            color = mix(vec3(0.05), vec3(0.6, 0.5, 0.35), t);
        }
        else if (id == 1)
        {
            color = mix(vec3(0.05), vec3(3.0, 2.5, 1.65), t);
        }
        
        col = shad * color;
        col = mix(col, background, length(p) / t_max);
    }
    
    //bad tonemap
    return col / (1 + col);
}

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    vec2 _uv = FragCoord;
    _uv = 0.5 * _uv + 0.5;
    _uv *= 1 - _uv;
    float vig = pow(_uv.x*_uv.y*15, 0.15);
    
    //sqrt() for gamma-correction
    FragColor = vig * sqrt(render(uv));
}
