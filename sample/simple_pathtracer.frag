#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
uniform int uFrameIndex;
uniform sampler2D uPrevFrame;

in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

#define noz(v) normalize(v)
#define _dot(a, b) max(0, dot(a, b))

float hash(in float seed)
{
    return 2.0 * fract(sin(seed + 20.0) * (82121.721 + 821.5*uFrameIndex)) - 1.0;
}

float map(in vec3 p, out int matid)
{
    float sdf_sphere = length(p - vec3(0, 1.0, 0)) - 1.0 + 0.03*sin(20*p.x)*sin(20*p.y)*sin(20*p.z);
    float sdf_plane = p.y;
    
    p.y -= -1.1;
    float sdf_torus = length(vec2(length(p.xz), p.y) - 1.5) - 0.3;
    
    float min_sdf = min(sdf_plane, min(sdf_torus, sdf_sphere));
    if (min_sdf == sdf_torus)
    {
        matid = 1;
    }
    else
    {
        matid = 0;
    }
    return min_sdf;
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

vec3 pathtrace_render(in vec2 uv)
{
    vec3 ro = vec3(0, 3, -4);
    vec3 at = vec3(0, 1, 0);
    vec3 cam_z = noz(at - ro);
    vec3 cam_x = noz(cross(vec3(0,1,0), cam_z));
    vec3 cam_y = noz(cross(cam_z, cam_x));
    vec3 rd = noz(cam_x * uv.x + cam_y * uv.y + 2.0 * cam_z);
    
    vec3 sky = vec3(1.0);
    vec3 plastic = vec3(0.8);
    vec3 rad = vec3(0.8, 0.5, 0.2);
    
    vec3 next_ro = ro;
    vec3 next_n = rd;
    vec3 attenuation = vec3(1);
    for (int bounce = 0; bounce < 8; ++bounce)
    {
        float t = 0.1;
        int matid = -1;
        for (int i = 0; i < 256; ++i)
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
        
        if (matid == -1)
        {
            break;
        }
        else
        {
            if (matid == 1)
            {
                attenuation *= rad;
            }
            else
            {
                attenuation *= plastic;
            }
            
            next_ro = next_ro + t*next_n;
            next_n = noz(map_n(next_ro) + rand_unit_vec3(721.15*next_ro.x + 821.1*float(bounce), 
                                                         82111.5*next_ro.y + 71.5*float(bounce), 
                                                         71.1*next_ro.z + 581.3*float(bounce)));
        }
    }
    
    return attenuation * sky;
}

void main()
{
    vec2 texCoord = 0.5 * FragCoord + 0.5;
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
#if 0
    vec3 ro = vec3(0, 3, -4);
    vec3 at = vec3(0, 1, 0);
    vec3 cam_z = noz(at - ro);
    vec3 cam_x = noz(cross(vec3(0,1,0), cam_z));
    vec3 cam_y = noz(cross(cam_z, cam_x));
    vec3 rd = noz(cam_x * uv.x + cam_y * uv.y + 2.0 * cam_z);
    
    vec3 sky = vec3(1.0);
    vec3 plastic = vec3(0.8);
    vec3 rad = vec3(0.8, 0.5, 0.2);
    
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
        vec3 l = -noz(vec3(0.5, -0.5, 0.5));
        
        if (matid == 1)
        {
            col = _dot(n, l) * rad;
        }
        else
        {
            col = _dot(n, l) * plastic;
        }
    }
    
    FragColor = col;
#else
    int sample_count = uFrameIndex + 1;
    vec3 contrib = pathtrace_render(uv);
    vec3 prev_sample_sum = texture(uPrevFrame, texCoord).rgb;
    
    FragColor = prev_sample_sum * (float(sample_count - 1) / float(sample_count)) + contrib * (1.0 / float(sample_count));
#endif
}
