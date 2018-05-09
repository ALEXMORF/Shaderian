#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels

uniform int uFrameIndex;
uniform sampler2D uPrevFrame;

in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

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

float turbulance(in vec3 p)
{
    float res = 0;
    float amp = 0.5;
    float freq = 2.0;
    for (int i = 0; i < 5; ++i)
    {
        res += amp*abs(2.0 * noise(freq*p) - 1.0);
        amp *= 0.5;
        freq *= 2.0;
    }
    return res;
}

float sd_box(vec3 p, vec3 b)
{
    vec3 d = abs(p) - b;
    return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

float de_watermelon(in vec3 p)
{
    float cut = length(p.yz - vec2(0.8, -0.8)) - 0.9;
    float body = length(p * vec3(0.83, 1, 1)) - 1;
    return body;
    return max(body, -cut);
}

float de_table(in vec3 p)
{
    return max(p.y, length(p.xz) - 4);
}

float map(in vec3 p, out int id)
{
    float table = de_table(p);
    float watermelon = de_watermelon(p - vec3(0, 1, 0));
    float d = min(table, watermelon);
    
    if (d == table)
    {
        id = 0;
    }
    if (d == watermelon)
    {
        id = 1;
    }
    return d;
}

vec3 map_n(in vec3 p)
{
    vec2 e = vec2(0, 0.001);
    int garbage;
    return normalize(vec3(map(p + e.yxx, garbage), 
                          map(p + e.xyx, garbage), 
                          map(p + e.xxy, garbage)) - map(p, garbage));
}

float shadow(in vec3 p, in vec3 l)
{
    float res = 1;
    float k = 8;
    
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
        res = min(res, k*d/t);
        t += d;
    }
    
    return res;
}

vec3 sample_sky(in vec3 rd)
{
    vec3 top = 1.0*vec3(0.5, 0.6, 1.6);
    vec3 bot = 2.0*vec3(0.6, 0.6, 0.5);
    return mix(bot, top, 0.5 * rd.y + 0.5);
}

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    float time = 0.2*uTime;
    vec3 at = vec3(0,1,0);
    vec3 ro = vec3(4*sin(time), 2, -4*cos(time));
    vec3 cam_z = normalize(at - ro);
    vec3 cam_x = normalize(cross(vec3(0,1,0), cam_z));
    vec3 cam_y = cross(cam_z, cam_x);
    vec3 rd = normalize(cam_x * uv.x + cam_y * uv.y + 2 * cam_z);
    
    int id = -1;
    float t = 0.001;
    float t_max = 50;
    for (int i = 0; i < 256 && t < t_max; ++i)
    {
        int curr_id;
        float d = map(ro + t*rd, curr_id);
        if (d < 0.0005)
        {
            id = curr_id;
            break;
        }
        t += d;
    }
    
    vec3 p = ro + t*rd;
    vec3 sky = sample_sky(rd);
    vec3 sun_color = vec3(2);
    vec3 col = sky;
    if (id != -1)
    {
        //mark the meat as 2 to differentiate from shell
        if (id == 1 && length(p * vec3(0.83, 1, 1) - vec3(0, 1, 0)) < 0.95)
        {
            id = 2;
        }
        
        vec3 n = map_n(p);
        vec3 l = -normalize(vec3(0.5, -0.7, 0.5));
        
        float ao = 1;
        if (id == 0)
        {
            ao = smoothstep(0, 1, length(p * vec3(0.83, 1, 1)));
        }
        else if (id == 1 || id == 2)
        {
            ao = 0.5 * (dot(n, vec3(0,1,0)) + 1);
        }
        
        float roughness;
        if (id == 0)
        {
            roughness = 0.8;
        }
        else if (id == 1)
        {
            roughness = 0.22;
        }
        else if (id == 2)
        {
            roughness = 0.7;
        }
        
        vec3 shad = vec3(0);
        shad += 0.3 * ao * sample_sky(n);
        
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
        
        vec3 color = vec3(1);
        if (id == 0)
        {
            float color_t = fbm(p*vec3(3,0,0.3));
            color = mix(vec3(0), vec3(0.55, 0.35, 0.1), color_t);
        }
        else if (id == 1)
        {
            float color_t = fbm(vec3(p.x * 0.6, abs(p.y - 1) * 3, p.z * 3));
            color_t = pow(color_t, 3);
            color = mix(vec3(0), vec3(0.3, 0.7, 0), color_t);
        }
        else if (id == 2)
        {
            float color_t = turbulance(2*p);
            color = mix(vec3(0.7, 0.2, 0.2), vec3(1, 0, 0), color_t);
        }
        
        col = shad * color;
        col = mix(col, sky, pow(t / t_max, 2));
    }
    
    vec2 vig_uv = 0.5*FragCoord + 0.5;
    vig_uv *= 1.0 - vig_uv;
    float vig = pow(vig_uv.x * vig_uv.y * 15, 0.15);
    
    col = vec3(1) - exp(-col * 3.0);
    FragColor = vig * sqrt(col);
}
