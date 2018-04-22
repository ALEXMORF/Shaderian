#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
uniform int uFrameIndex; // window client rect resolution in pixels
uniform sampler2D uPrevFrame;
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

void main()
{
    FragColor = vec3(0.001) + texture(uPrevFrame, 0.5*FragCoord + 0.5).rgb;
}