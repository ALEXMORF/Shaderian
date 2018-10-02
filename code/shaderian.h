#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

struct string
{
    int Capacity;
    char *E;
};

#define STACK_STRING(Str) string{ARRAY_COUNT(Str), Str}

struct framebuffer
{
    GLuint Handle;
    GLuint Texture;
    GLuint Renderbuffer;
};

struct app_state
{
    char *LastShaderSource;
    char *ShaderFilename;
    FILETIME ShaderLastWriteTime;
    
    GLuint GraceHdrMap;
    GLuint GlacierHdrMap;
    GLuint UffiziHdrMap;
    GLuint EnnisHdrMap;
    GLuint PisaHdrMap;
    GLuint DogeHdrMap;
    
    GLuint ScreenQuadVAO;
    GLuint Program;
    framebuffer Buffers[2];
    int BufferWidth;
    int BufferHeight;
    
    f32 TimeInSeconds;
    i32 FrameIndex;
    i32 CurrentBufferIndex;
    
    b32 IsInitialized;
};

//NOTE(chen): concat the given filename with the model's directory
typedef void get_module_path(char *Filename, char *Out_Path, int PathSize);
static get_module_path *GetModulePath;