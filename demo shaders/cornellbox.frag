#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels

uniform int uFrameIndex;
uniform sampler2D uPrevFrame;

in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

struct material
{
    vec3 albedo;
    vec3 emissive;
    float specular;
};

struct plane
{
    vec3 n;
    vec3 p;
    material mat;
};

struct sphere
{
    vec3 p;
    float r;
    material mat;
};

struct disk
{
    vec3 n;
    vec3 p;
    float r;
    material mat;
};

float hash(in float x)
{
    return fract(sin(219.151*x)*9012.15);
}

vec3 random_ray(vec3 n, vec2 uv)
{
    float theta = 2 * 3.1415926 * uv.x;
    uv.y = 2 * uv.y - 1;
    vec3 sp = vec3(sqrt(1.0 - uv.y * uv.y) * vec2(cos(theta), sin(theta)), uv.y);
    vec3 rd = normalize(n + sp);
    return rd;
}

vec3 calc_rd(in vec3 ro, in vec3 at, in vec2 uv)
{
    vec3 cam_z = normalize(at - ro);
    vec3 cam_x = normalize(cross(vec3(0,1,0), cam_z));
    vec3 cam_y = cross(cam_z, cam_x);
    vec3 rd = normalize(uv.x * cam_x + uv.y * cam_y + 2 * cam_z);
    
    return rd;
}

void main()
{
    vec2 uv = FragCoord;
    uv.x *= uResolution.x / uResolution.y;
    
    vec3 ro = vec3(0, 1.0, -2);
    vec3 at = vec3(0, 1.0, 0);
    
    plane planes[6];
    
    //ground
    planes[0].n = vec3(0, 1, 0);
    planes[0].p = vec3(0);
    planes[0].mat.albedo = vec3(0.95);
    planes[0].mat.emissive = vec3(0);
    planes[0].mat.specular = 0;
    
    //ceiling
    planes[1].n = vec3(0, -1, 0);
    planes[1].p = vec3(0, 3, 0);
    planes[1].mat.albedo = vec3(0.95);
    planes[1].mat.emissive = vec3(0);
    planes[1].mat.specular = 0;
    
    //left wall
    planes[2].n = vec3(1, 0, 0);
    planes[2].p = vec3(-1.5, 0, 0);
    planes[2].mat.albedo = vec3(0.55, 0, 0);
    planes[2].mat.emissive = vec3(0);
    planes[2].mat.specular = 0.0;
    
    //right wall
    planes[3].n = vec3(-1, 0, 0);
    planes[3].p = vec3(1.5, 0, 0);
    planes[3].mat.albedo = vec3(0, 0.55, 0);
    planes[3].mat.emissive = vec3(0);
    planes[3].mat.specular = 0;
    
    //frontwall
    planes[4].n = vec3(0, 0, -1);
    planes[4].p = vec3(0, 0, 4);
    planes[4].mat.albedo = vec3(0.95);
    planes[4].mat.emissive = vec3(0);
    planes[4].mat.specular = 0.0;
    
    //backwall
    planes[5].n = vec3(0, 0, 1);
    planes[5].p = vec3(0, 0, -2.5);
    planes[5].mat.albedo = vec3(0.95);
    planes[5].mat.emissive = vec3(0);
    planes[5].mat.specular = 0.0;
    
    sphere spheres[3];
    
    spheres[0].p = vec3(-0.9, 0.5, 2);
    spheres[0].r = 0.5;
    spheres[0].mat.albedo = vec3(0.95);
    spheres[0].mat.emissive = vec3(0);
    spheres[0].mat.specular = 0;
    
    spheres[1].p = vec3(0.9, 0.5, 1.0);
    spheres[1].r = 0.5;
    spheres[1].mat.albedo = vec3(0.95);
    spheres[1].mat.emissive = vec3(0);
    spheres[1].mat.specular = 0;
    
    spheres[2].p = vec3(0, 1.5, 3.3);
    spheres[2].r = 0.4;
    spheres[2].mat.albedo = vec3(0.95);
    spheres[2].mat.emissive = vec3(0);
    spheres[2].mat.specular = 0.98;
    
    disk disks[1];
    
    disks[0].p = vec3(0, 2.99, 2);
    disks[0].n = vec3(0, -1, 0);
    disks[0].r = 0.9;
    disks[0].mat.albedo = vec3(0.95);
    disks[0].mat.emissive = vec3(3);
    disks[0].mat.specular = 0;
    
#define TOLERANCE 0.0001
    
    vec3 total_col = vec3(0);
    int spp = 32;
    int bounce_count = 8;
    for (int sample_index = 0;
         sample_index < spp;
         ++sample_index)
    {
        vec3 col = vec3(0);
        vec3 atten = vec3(1);
        
        //random jitter to multi-sample
        vec2 d_uv = (1.0 / uResolution) * (-1.0 + 2.0 * vec2(hash(69.1*uv.x + 82.15*uv.y + float(15.1*sample_index) + 9.1*uTime), hash(75.1*uv.x + 52.15*uv.y + float(5.1*sample_index) + 15.1*uTime)));
        d_uv.x *= uResolution.x / uResolution.y;
        vec3 next_ro = ro;
        vec3 next_rd = calc_rd(ro, at, uv + d_uv);
        
        for (int bounce_index = 0;
             bounce_index < bounce_count; 
             ++bounce_index)
        {
            float max_t = 10e31;
            float t = max_t;
            vec3 next_n;
            material mat;
            
            //ray vs plane
            for (int i = 0; i < planes.length(); ++i)
            {
                vec3 n = planes[i].n;
                vec3 p = planes[i].p;
                
                float denom = dot(next_rd, n);
                if (denom != 0)
                {
                    float new_t = dot(p - next_ro, n) / denom;
                    
                    if (new_t > TOLERANCE && new_t < t)
                    {
                        t = new_t;
                        next_n = n;
                        mat = planes[i].mat;
                    }
                }
            }
            
            //ray vs sphere
            for (int i = 0; i < spheres.length(); ++i)
            {
                vec3 p = spheres[i].p;
                float r = spheres[i].r;
                
                float a = dot(next_rd, next_rd);
                float b = 2 * dot(next_ro - p, next_rd);
                float c = dot(next_ro - p, next_ro - p) - r*r;
                
                float denom = 2 * a;
                float sqrt_term = b*b - 4*a*c;
                
                if (denom != 0 && sqrt_term > 0)
                {
                    float new_t1 = (-b + sqrt(sqrt_term)) / denom;
                    float new_t2 = (-b - sqrt(sqrt_term)) / denom;
                    
                    float new_t = min(new_t1, new_t2);
                    if (new_t > TOLERANCE && new_t < t)
                    {
                        t = new_t;
                        next_n = normalize(next_ro + t*next_rd - p);
                        mat = spheres[i].mat;
                    }
                }
            }
            
            //ray vs disk
            for (int i = 0; i < disks.length(); ++i)
            {
                vec3 p = disks[i].p;
                vec3 n = disks[i].n;
                float r = disks[i].r;
                
                float denom = dot(next_rd, n);
                if (denom != 0)
                {
                    float new_t = dot(p - next_ro, n) / denom;
                    vec3 hit_p = next_ro + new_t * next_rd;
                    
                    if (length(hit_p - p) < r && 
                        new_t > TOLERANCE && new_t < t)
                    {
                        t = new_t;
                        next_n = n;
                        mat = disks[i].mat;
                    }
                }
            }
            
            if (t > TOLERANCE && t != max_t)
            {
                next_ro = next_ro + t*next_rd;
                vec2 uv = vec2(hash(69.1*next_ro.x + 82.15*next_ro.y + 91.7*next_ro.z + float(15.1*sample_index) + 9.1*uTime), hash(75.1*next_ro.x + 52.15*next_ro.y + 60.7*next_ro.z + float(5.1*sample_index) + 15.1*uTime));
                next_rd = mix(random_ray(next_n, uv), reflect(next_rd, next_n), mat.specular);
                
                col += atten * mat.emissive;
                atten *= mat.albedo;
            }
            else
            {
                break;
            }
            
        } //end of bounce loop
        
        total_col += col / float(spp);
    } //end of spp loop
    
    //tonemap
    total_col = 1-exp(-3*total_col);
    
    int frame_count = uFrameIndex + 1;
    float prev_weight = float(frame_count - 1) / float(frame_count);
    float curr_weight = 1.0 - prev_weight;
    
    vec3 prev_col = texture(uPrevFrame, 0.5 * FragCoord + 0.5).rgb;
    //FragColor = prev_weight * prev_col + curr_weight * total_col;
    FragColor = sqrt(prev_weight * pow(prev_col,vec3(2)) + curr_weight * total_col);
}
