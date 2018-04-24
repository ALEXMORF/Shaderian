#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels

uniform int uFrameIndex;
uniform sampler2D uPrevFrame;

in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

#define noz(value) normalize(value)
#define _dot(a, b) max(0, dot(a, b))

float hash(in float seed)
{
    return fract(sin(seed) * 9051.21);
}

float sd_box(in vec3 p)
{
    return max(max(abs(p.x), abs(p.y)), abs(p.z)) - 1.0;
}

float sd_cross(in vec3 p)
{
    float arm1 = max(abs(p.x), abs(p.y)) - 0.33;
    float arm2 = max(abs(p.x), abs(p.z)) - 0.33;
    float arm3 = max(abs(p.y), abs(p.z)) - 0.33;
    return min(arm1, min(arm2, arm3));
}

mat2 rotate2d(in float a)
{
    float c = cos(a);
    float s = sin(a);
    return mat2(c, s, -s, c);
}

float sd_menger(in vec3 p)
{
    float d  = sd_box(p);
    
    float s = 1.0;
    for(int i = 0; i < 3; i++)
    {
        vec3 a = mod(p*s, 2.0 )-1.0;
        s *= 3.0;
        vec3 r = 1.0 - 3.0*abs(a);
        
        float c = sd_cross(r)/s;
        d = max(d,-c);
        
        p -= 1.0;
        p.xy *= rotate2d(1.5);
        p += 2.2;
    }
    
    return d;
}

float map(in vec3 p)
{
    float menger = sd_menger(p - vec3(0, 1.0, 0));
    float floor = p.y;
    return min(floor, menger);
}

vec3 map_normal(in vec3 p)
{
    vec2 e = vec2(0, 0.001);
    return noz(vec3(map(p + e.yxx), map(p + e.xyx), map(p + e.xxy)) - map(p));
}

vec3 direct_render(in vec3 ro, in vec3 rd)
{
    float t_max = 20;
    float iter_max = 256;
    
    bool hit = false;
    float t = 0.001;
    float iter = 0;
    for (int i = 0; i < int(iter_max) && t < t_max; ++i)
    {
        float d = map(ro + t*rd);
        if (d < 0.001)
        {
            iter = float(i);
            hit = true;
            break;
        }
        t += d;
    }
    float ao = 1 - (iter / iter_max);
    
    vec3 p = ro + t*rd;
    vec3 background = vec3(0.1);
    vec3 col = background;
    if (hit)
    {
        vec3 n = map_normal(p);
        vec3 l = -noz(vec3(0.5, -0.9, 0.5));
        float shad = 0.25 * pow(1 + _dot(n, l), 2);
        col = ao * shad * vec3(1);
        col = mix(col, background, pow(t / t_max, 1.5));
    }
    
    return col;
}

vec3 sample_sky(vec3 rd)
{
    vec3 sky = vec3(0.5, 0.6, 0.7);
    vec3 sun = vec3(2.0, 2.0, 0.6);
    vec3 sun_l = noz(vec3(-0.5, 0.9, -0.5));
    
    float angle_cosine = dot(sun_l, noz(rd));
    if (abs(angle_cosine) > 0.7)
    {
        return sun;
    }
    return sky;
}

vec3 pathtrace_render(in vec3 ro, in vec3 rd)
{
    vec3 mat = vec3(0.6, 0.5, 0.5);
    vec3 radiance = vec3(0);
    vec3 attenuation = vec3(1);
    
    for (int bounce = 0; bounce < 32; ++bounce)
    {
        bool hit = false;
        float t = 0.01;
        for (int i = 0; i < 256; ++i)
        {
            float d = map(ro + t*rd);
            if (d < 0.001)
            {
                hit = true;
                break;
            }
            t += d;
        }
        
        if (hit)
        {
            attenuation *= mat;
            
            ro = ro + t*rd;
            vec3 n = map_normal(ro);
            
            float u = hash(11.3*length(ro) + 711.1 + 71.5*float(bounce) + 3.7*float(uFrameIndex)); //hash
            float v = hash(6.1*length(ro) + 515.7 + 11.3*float(bounce) + 22.1*float(uFrameIndex)); //hash
            
            // Fizzer's consine distribution
            float a = 6.2831853 * v;
            u = 2.0*u - 1.0;
            rd = normalize(n + vec3(sqrt(1.0-u*u) * vec2(cos(a), sin(a)), u));
        }
        else
        {
            radiance += attenuation * sample_sky(rd);
            break;
        }
    }
    
    return radiance;
}

void main()
{
    vec2 tex_coord = 0.5 * FragCoord + 0.5;
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    float time = 1.1;
    vec3 ro = vec3(4 * cos(time), 2.5, -4 * sin(time));
    vec3 at = vec3(0, 0.5, 0);
    vec3 cam_z = noz(at - ro);
    vec3 cam_x = noz(cross(vec3(0,1,0), cam_z));
    vec3 cam_y = noz(cross(cam_z, cam_x));
    vec3 rd = noz(cam_x * uv.x + cam_y * uv.y + 2 * cam_z);
    
#if 1
    vec3 prev_contrib = texture(uPrevFrame, tex_coord).rgb;
    prev_contrib = pow(prev_contrib, vec3(2)); //gamma -> linear
    
    vec3 contrib = pathtrace_render(ro, rd);
    contrib = contrib / (1 + contrib);
    
    float sample_count = uFrameIndex + 1;
    vec3 total_contrib = prev_contrib * (sample_count - 1) / sample_count + contrib * (1 / sample_count);
    
    FragColor = sqrt(total_contrib); //linear -> gamma
#else
    FragColor = direct_render(ro, rd);
#endif
}
