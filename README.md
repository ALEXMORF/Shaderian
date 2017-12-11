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

# Integration with your editor

When shaderian is deactivated, it will stay as a layered window, and you can still edit the file while seeing changes. 


Shaderian combined with your favorite editor:

<img width="820" alt="shaderian_demo" src="https://user-images.githubusercontent.com/16845654/33856681-bb18d78c-de7d-11e7-97af-792efa8b5d73.PNG">
