# Shaderian

A live GLSL programming environment on windows. Edit your shader code and see the changes happen, live!

# Usage

shaderian.exe [shader filename] [option]

# Options

shazan - create an opengl 3.0 context instead of 3.3 core profile context



# Starter code

This is the starter code, just copy paste this into your shader and start from there. 

```
#version 330 core //or your respective version of glsl

uniform float uTime;      // time the app has been running in seconds
uniform vec2 uResolution; // window client rect resolution in pixels
uniform int uFrameIndex;  // the count of frames that's been run before current frame
uniform sampler2D uPrevFrame;  // access to previous frame as texture

// HDR environment maps
uniform sampler2D GraceCathedral;
uniform sampler2D Glacier;
uniform sampler2D UffiziGallery;
uniform sampler2D EnnisDiningRoom;
uniform sampler2D PisaCourtyard;
uniform sampler2D DogeCourtyard;

in vec2 FragCoord;        // normalized fragment coordinate, range: <[-1, 1], [-1, 1]>
out vec3 FragColor;       // output color

void main()
{
//your code
}
```

# New Feature: Access to previous frame and frame indexer

This allows you to propogate information throughout all your frames. It is particularly powerful because it allows you do this stuff
like progressive pathtracing and simulations with ease:

![base profile screenshot 2018 04 22 - 13 22 33 57](https://user-images.githubusercontent.com/16845654/39100342-4f3381fc-463d-11e8-9d3d-3843d40edb53.png)

(Rendered with shaderian, you can find this shader as sample/fractal_pathtracer.frag)

![image](https://user-images.githubusercontent.com/16845654/39226536-ee49b57e-4807-11e8-8be2-33c0174d0f58.png)

(Rendered with shaderian, you can find this shader as sample/menger_sponge.frag)

# Integration with your editor

When shaderian is deactivated, it will stay as a layered window, and you can still edit the file while seeing changes. 


Shaderian combined with your favorite editor:

<img width="820" alt="shaderian_demo" src="https://user-images.githubusercontent.com/16845654/33856681-bb18d78c-de7d-11e7-97af-792efa8b5d73.PNG">

# Tutorials

Look at the code under "sample" folder. I've written some basic shaders that does interesting things and put them there. They aren't too advanced yet so it'd be easy to digest.

You can also watch this youtube video on how to get started:

[getting started](https://www.youtube.com/watch?v=6BZuYtx3Uyw)
