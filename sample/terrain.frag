#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

float hash(vec2 uv)
{
    return fract(sin(dot(uv, vec2(73211.171, 841.13))) * 32131.18128);
}

float noise(vec2 uv)
{
    vec2 ipos = floor(uv);
    vec2 fpos = fract(uv);
    
    float a = hash(ipos);
    float b = hash(ipos + vec2(1, 0));
    float c = hash(ipos + vec2(0, 1));
    float d = hash(ipos + vec2(1, 1));
    
    vec2 t = smoothstep(0.0, 1.0, fpos);
    
    return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}

float fbm(vec2 uv)
{
    float acc = 0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 6; ++i)
    {
#if 0
        acc += amp * abs(2.0 * noise(freq * uv) - 1.0);
#else 
        acc += amp * noise(freq * uv);
#endif
        freq *= 2.0;
        amp *= 0.5;
    }
    return acc;
}

float intersect(in vec3 ro, in vec3 rd, in float t_max, out bool hit)
{
    hit = false;
    float t = 0.1;
    
    for (int i = 0; i < 256; ++i)
    {
        vec3 p = ro + t*rd;
        float h = p.y - fbm(p.xz);
        if (h < 0.004*t || t > t_max)
        {
            hit = true;
            break;
        }
        
        t += 0.45 * h;
    }
    return t;
}

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    vec3 ro = vec3(0.0, 1.0, 0.0);
    vec3 at = vec3(0.0, 0.2, 4.0);
    vec3 cam_z = normalize(at - ro);
    vec3 cam_x = normalize(cross(vec3(0, 1, 0), cam_z));
    vec3 cam_y = normalize(cross(cam_z, cam_x));
    vec3 rd = cam_x * uv.x + cam_y * uv.y + 2.0 * cam_z;
    
    ro += vec3(0.0, 0.8, mod(10.0*uTime, 1000));
    vec3 l = normalize(vec3(0.5, -0.5, 0.5));
    
    bool hit;
    float t_max = 27.5;
    float t = intersect(ro, rd, t_max, hit);
    
    vec3 p = ro + t*rd;
    
    //NOTE(chen): a hack, note dpdx and dpdz are not actual partial derivatives, just some offseted vector
    vec3 px = vec3(p.x + 0.0001, 0.0, p.z);
    vec3 pz = vec3(p.x, 0.0, p.z + 0.0001);
    vec3 dpdx = vec3(px.x, fbm(px.xz), px.z);
    vec3 dpdz = vec3(pz.x, fbm(pz.xz), pz.z);
    
    vec3 normal = normalize(cross(dpdz, dpdx));
    
    vec3 background = vec3(0.8, 0.8, 0.5);
    vec3 col = background;
    if (hit)
    {
        float occ = p.y;
        float dl = 0.25 * pow(dot(normal, -l) + 1.0, 2.0);
        float lighting = 0.9 * dl + 0.3;
        vec3 mat = vec3(0.8, 0.3, 0.0);
        
        col = mix(occ * lighting * mat, background, pow(t / t_max, 1.5));
    }
    
    FragColor = col;
}
