# Shaderian

A live GLSL programming environment on windows. Edit your shader code and see the changes happen, live!

# Usage

shaderian.exe [shader filename]

# Current uniforms 

```
uniform float uTime;      //time the app has been running in seconds
uniform vec2 uResolution; //window client rect resolution in pixels
```

# inputs from vertex shader

```
in vec2 FragCoord;        //normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
```

# output from fragment shader

You can just specify an outputing vec4 with any name, as long as there is only one output.
For example:

```
out vec4 FragColor;
```