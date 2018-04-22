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

