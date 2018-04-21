#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

#define noz(v) normalize(v)
#define _dot(a, b) max(0, dot(a, b))

float de_mandelbulb(in vec3 p)
{
    float power = min(8, 0.25*uTime + 1);
    
    vec3 w = p;
    float dw = 1.0;
    for (int i = 0; i < 9; ++i)
    {
        //gradient:
        dw = power * pow(length(w), power-1) * dw + 1;
        
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
        
        w += p;
        
        if (length(w) > 256)
        {
            break;
        }
    }
    
    float d = 0.50*length(w) * log(length(w)) / dw;
    return d;
}

float map(in vec3 p)
{
    return de_mandelbulb(p);
}

float shadow(in vec3 p, in vec3 l)
{
    float k = 8;
    float res = 1.0;
    
    float t = 0.1;
    float t_max = 10.0;
    while (t < t_max)
    {
        float d = map(p + t*l);
        if (d < 0.001)
        {
            return 0.0;
        }
        res = min(res, d*k/t);
        t += d;
    }
    return res;
}

vec3 map_n(in vec3 p)
{
    vec2 e = vec2(0, 0.001);
    return noz(vec3(map(p + e.yxx), map(p + e.xyx), map(p + e.xxy)) - map(p));
}

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    float time = 0.05*uTime;
    float radius = 1.7;
    vec3 ro = vec3(radius*cos(time), radius*sin(time), radius*sin(time));
    vec3 at = vec3(0);
    vec3 cam_z = noz(at - ro);
    vec3 cam_x = noz(cross(vec3(0,1,0), cam_z));
    vec3 cam_y = noz(cross(cam_z, cam_x));
    vec3 rd = noz(cam_x * uv.x + cam_y * uv.y + 2 * cam_z);
    
    float t = 0.001;
    float t_max = 50.0;
    float iter = 0;
    float iter_max = 256;
    int matid = -1;
    for (int i = 0; i < iter_max && t < t_max; ++i)
    {
        float d = map(ro + t*rd);
        if (d < 0.001)
        {
            matid = 0;
            iter = i;
            break;
        }
        t += d;
    }
    
    float occ = iter / iter_max;
    vec3 col  = vec3(0);
    if (matid != -1)
    {
        vec3 n = map_n(ro + t*rd);
        vec3 l = -noz(vec3(0.5, -0.5, 0.8));
        float shad = _dot(n, l);
        col = vec3(occ) + 0.2 + 0.8 * shadow(ro + t*rd, l) * shad * vec3(1);
    }
    FragColor = sqrt(col);
}
