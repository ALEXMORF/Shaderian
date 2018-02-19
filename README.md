# Shaderian

A live GLSL programming environment on windows. Edit your shader code and see the changes happen, live!

# Usage

shaderian.exe [shader filename]

This is the starter code, just copy paste this into your shader and start from there. 

```
#version 330 core

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

void main()
{
//your code
}
```

# Integration with your editor

When shaderian is deactivated, it will stay as a layered window, and you can still edit the file while seeing changes. 


Shaderian combined with your favorite editor:

<img width="820" alt="shaderian_demo" src="https://user-images.githubusercontent.com/16845654/33856681-bb18d78c-de7d-11e7-97af-792efa8b5d73.PNG">
