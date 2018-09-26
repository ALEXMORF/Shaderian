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

#define noz(v) normalize(v)
#define _dot(a, b) max(0, dot(a, b))

float hash(in float seed)
{
    return 2.0 * fract(sin(seed) * (8211.721 + 821.5*uFrameIndex)) - 1.0;
}
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
    
    return 2.0 * res - 1.0;
}

float de_mandelbulb(in vec3 p)
{
    float power = 8;
    
    vec3 w = vec3(p);
    float dw = 1.0;
    for (int i = 0; i < 5; ++i)
    {
        //gradient:
        dw = power * pow(length(w), power-1) * dw + 1;
        
#if 0   //NOTE(chen): iq's quick version
        float x = w.x; float x2 = x*x; float x4 = x2*x2;
        float y = w.y; float y2 = y*y; float y4 = y2*y2;
        float z = w.z; float z2 = z*z; float z4 = z2*z2;
        
        float k3 = x2 + z2;
        float k2 = inversesqrt( k3*k3*k3*k3*k3*k3*k3 );
        float k1 = x4 + y4 + z4 - 6.0*y2*z2 - 6.0*x2*y2 + 2.0*z2*x2;
        float k4 = x2 - y2 + z2;
        
        w.x =  64.0*x*y*z*(x2-z2)*k4*(x4-6.0*x2*z2+z4)*k1*k2;
        w.y = -16.0*y2*k3*k4*k4 + k1*k1;
        w.z = -8.0*y*k4*(x4*x4 - 28.0*x4*x2*z2 + 70.0*x4*z4 - 28.0*x2*z2*z4 + z4*z4)*k1*k2;
#else
        // extract polar coordinates
        float wr = length(w);
        float wo = acos(w.y/wr);
        float wi = atan(w.x,w.z);
        
        // scale and rotate the point
        wr = pow(wr, power);
        wo = wo * power;
        wi = wi * power;
        
        // convert back to cartesian coordinates
        w.x = wr * sin(wo)*sin(wi);
        w.y = wr * cos(wo);
        w.z = wr * sin(wo)*cos(wi);
#endif
        
        w += p;
        
        if (length(w) > 256)
        {
            break;
        }
    }
    
    float d = 0.50 * length(w) * log(length(w)) / dw;
    return d;
}

float map(in vec3 p, out int matid)
{
#if 0
    float sdf_sphere = length(p - vec3(0, 1.0, 0)) - 1.1;
    float sdf_plane = p.y;
    
    p.y -= -1.1;
    float sdf_torus = length(vec2(length(p.xz), p.y) - 1.5) - 0.3;
    p.y += -1.1;
    
    float min_sdf = min(sdf_plane, min(sdf_sphere, sdf_torus));
    if (min_sdf == sdf_torus)
    {
        matid = 1;
    }
    else if (min_sdf == sdf_sphere)
    {
        matid = 2;
    }
    else
    {
        matid = 0;
    }
    return min_sdf;
    
#else
    float sdf_plane = p.y;
    sdf_plane += 0.7 * fbm(p);
    
    p.y -= 1.0;
    float sdf_mandelbulb = de_mandelbulb(p);
    p.y += 1.0;
    
    float min_sdf = min(sdf_plane, sdf_mandelbulb);
    if (min_sdf == sdf_mandelbulb)
    {
        matid = 2;
    }
    else
    {
        matid = 0;
    }
    return min_sdf;
    
#endif
}

vec3 mat_lookup(in int matid)
{
    if (matid == 0)
    {
        return vec3(0.8, 0.8, 0.5);
    }
    else if (matid == 1)
    {
        return vec3(0.8, 0.5, 0.2);
    }
    else if (matid == 2)
    {
        return vec3(0.4, 0.8, 0.8);
    }
    else
    {
        return vec3(0.8);
    }
}

vec3 map_n(in vec3 p)
{
    vec2 e = vec2(0, 0.001);
    int matid;
    return noz(vec3(map(p + e.yxx, matid), map(p + e.xyx, matid), map(p + e.xxy, matid)) - map(p, matid));
}

vec3 rand_unit_vec3(in float seed1, in float seed2, in float seed3)
{
    vec3 res = noz(vec3(hash(seed1), hash(seed2), hash(seed3)));
    return res;
}

vec3 calc_sky(in vec3 rd, in vec3 l)
{
#if 1
    return vec3(1.0);
#else
    vec3 col1 = vec3(0.4);
    vec3 col2 = vec3(0.3, 0.5, 0.7);
    vec3 col = mix(col2, col1, 0.5*rd.y + 0.5);
    return 2.0*col;
#endif
}

vec3 pathtrace_render(in vec3 ro, in vec3 rd, in vec3 l)
{
    float t_total = 0.0;
    vec3 next_ro = ro;
    vec3 next_n = rd;
    vec3 attenuation = vec3(1);
    for (int bounce = 0; bounce < 8; ++bounce)
    {
        float t = 0.1;
        int matid = -1;
        for (int i = 0; i < 256 && t < 200; ++i)
        {
            int curr_matid;
            float d = map(next_ro + t*next_n, curr_matid);
            if (d < 0.005)
            {
                matid = curr_matid;
                break;
            }
            t += d;
        }
        
        t_total += t;
        if (matid == -1)
        {
            break;
        }
        else
        {
            next_ro = next_ro + t*next_n;
            vec3 n = map_n(next_ro);
            attenuation *= mat_lookup(matid);
            next_n = noz(n + rand_unit_vec3(72.15*next_ro.x + 821.1*float(bounce), 
                                            821.5*next_ro.y + 71.5*float(bounce), 
                                            71.1*next_ro.z + 581.3*float(bounce)));
        }
    }
    
    return attenuation *calc_sky(next_n, l);
}

void main()
{
    vec2 texCoord = 0.5 * FragCoord + 0.5;
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    vec3 ro = vec3(0, 1.4, -3.5);
    vec3 at = vec3(0, 0.8, 0);
    vec3 cam_z = noz(at - ro);
    vec3 cam_x = noz(cross(vec3(0,1,0), cam_z));
    vec3 cam_y = noz(cross(cam_z, cam_x));
    vec3 rd = noz(cam_x * uv.x + cam_y * uv.y + 2.0 * cam_z);
    vec3 l = -noz(vec3(0.5, -0.9, 0.5));
    
#if 0
    vec3 sky = vec3(0.2);
    
    float t = 0.1;
    int matid = -1;
    for (int i = 0; i < 256; ++i)
    {
        int curr_matid;
        float d = map(ro + t*rd, curr_matid);
        if (d < 0.005)
        {
            matid = curr_matid;
            break;
        }
        t += d;
    }
    
    vec3 col;
    if (matid == -1)
    {
        col = sky;
    }
    else
    {
        vec3 n = map_n(ro + t*rd);
        col = vec3(1.0) * _dot(n, l) * mat_lookup(matid);
    }
    
    //tonemap + gamma
    FragColor = sqrt(col / (1.0 + col));
    
#else
    vec3 contrib = pathtrace_render(ro, rd, l);
    contrib = contrib;
    vec3 prev_sample_sum = texture(uPrevFrame, texCoord).rgb;
    int sample_count = uFrameIndex + 1;
    FragColor = prev_sample_sum * (float(sample_count - 1) / float(sample_count)) + contrib * (1.0 / float(sample_count));
#endif
}
