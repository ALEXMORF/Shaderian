#version 330 core

uniform float uTime;
uniform vec2 uResolution;

in vec2 FragCoord;
out vec4 FragColor;

void main()
{
    vec2 st = FragCoord;
    st.x *= uResolution.x/uResolution.y;
    
    float r = distance(st, vec2(0.0));
    float c = 1.0-smoothstep(0.5, 0.53, r);
    
    FragColor = vec4(vec3(c), 1.0);
}

