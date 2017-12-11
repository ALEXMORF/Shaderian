struct string
{
    int Capacity;
    char *E;
};

#define STACK_STRING(Str) string{ARRAY_COUNT(Str), Str}

struct app_state
{
    char *LastShaderSource;
    char *ShaderFilename;
    FILETIME ShaderLastWriteTime;
    
    GLuint ScreenQuadVAO;
    GLuint Program;
    f32 TimeInSeconds;
    b32 IsInitialized;
};

