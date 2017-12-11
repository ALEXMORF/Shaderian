/*
TODO(chen):

. Change shaderian's interface function to mainImage() style, like shadertoy
. Recompile fragment shader only
. Make topmost style an option
. Need a test case for shader program linkage error
 . Add mouse input
 
*/

#include "shaderian.h"

inline GLuint
CompileShader(char *Source, GLenum Type)
{
    GLuint Shader = glCreateShader(Type);
    glShaderSource(Shader, 1, &Source, 0);
    glCompileShader(Shader);
    return Shader;
}

inline void
RemoveAndDeleteShader(GLuint Program, GLuint Shader)
{
    glDetachShader(Program, Shader);
    glDeleteShader(Shader);
}

inline void
ErrorMessageBox(char *Message)
{
    if (Message)
    {
        MessageBoxA(0, Message, "ERROR", MB_OK|MB_ICONERROR);
    }
}

inline b32
ValidateShader(GLuint Shader, string ErrorMessage = {})
{
    b32 ShaderIsCompiled = true;
    glGetShaderiv(Shader, GL_COMPILE_STATUS, &ShaderIsCompiled);
    if (!ShaderIsCompiled && ErrorMessage.E)
    {
        glGetShaderInfoLog(Shader, ErrorMessage.Capacity, 0, ErrorMessage.E);
    }
    return ShaderIsCompiled;
}

inline GLuint
CompileShaderProgram(char *FragShaderSrc, string ErrorMessage = {}, 
                     b32 ApplyStubOnFailure = true)
{
    GLuint Program = 0;
    
    char *VertShaderSrc = R"(
    #version 330 core
    
    layout (location = 0) in vec3 P;
    layout (location = 1) in vec2 TexCoord;
    
    out vec2 FragCoord;
    
    void main()
    {
    FragCoord = P.xy;
    gl_Position = vec4(P.xy, 0.0, 1.0);
    }
    
    )";
    
    char *StubFragShaderSrc = R"(
    #version 330 core
    
    uniform float uTime;
    
    in vec2 FragCoord;
    out vec4 FragColor;
    
    void main()
    {
    FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
    
    )";
    
    if (!FragShaderSrc)
    {
        FragShaderSrc = StubFragShaderSrc;
    }
    
    GLuint VertShader = CompileShader(VertShaderSrc, GL_VERTEX_SHADER);
    b32 VertShaderIsValid = ValidateShader(VertShader, ErrorMessage);
    GLuint FragShader = CompileShader(FragShaderSrc, GL_FRAGMENT_SHADER);
    b32 FragShaderIsValid = ValidateShader(FragShader, ErrorMessage);
    
    //if frag shader is invalid, use stub
    if (!FragShaderIsValid)
    {
        if (ApplyStubOnFailure)
        {
            glDeleteShader(FragShader);
            FragShader = CompileShader(StubFragShaderSrc, GL_FRAGMENT_SHADER);
            FragShaderIsValid = ValidateShader(FragShader);
        }
    }
    
    if (VertShaderIsValid && FragShaderIsValid)
    {
        Program = glCreateProgram();
        glAttachShader(Program, VertShader);
        glAttachShader(Program, FragShader);
        glLinkProgram(Program);
        RemoveAndDeleteShader(Program, VertShader);
        RemoveAndDeleteShader(Program, FragShader);
        
        b32 ProgramIsLinked = false;
        glGetProgramiv(Program, GL_LINK_STATUS, &ProgramIsLinked);
        
        if (!ProgramIsLinked)
        {
            glGetProgramInfoLog(Program, ErrorMessage.Capacity, 0, ErrorMessage.E);
            glDeleteProgram(Program);
            Program = 0;
        }
    }
    
    return Program;
}

inline FILETIME
GetFileLastWriteTime(char *Filename)
{
    FILETIME LastWriteTime = {};
    HANDLE FileHandle = CreateFileA(Filename, GENERIC_READ, 
                                    FILE_SHARE_READ|FILE_SHARE_WRITE, 0, 
                                    OPEN_EXISTING, 0, 0);
    if (FileHandle != INVALID_HANDLE_VALUE)
    {
        GetFileTime(FileHandle, 0, 0, &LastWriteTime);
        CloseHandle(FileHandle);
    }
    else
    {
        printf("Tried to access invalid file for timestamp\n");
    }
    
    return LastWriteTime;
}

inline b32
FileHasBeenUpdated(char *Filename, FILETIME OldLastWriteTime)
{
    FILETIME NewLastWriteTime = GetFileLastWriteTime(Filename);
    return CompareFileTime(&OldLastWriteTime, &NewLastWriteTime) != 0;
}

internal void
AppUpdateAndRender(app_state *App, f32 dT, int WindowWidth, int WindowHeight)
{
    if (!App->IsInitialized)
    {
        App->ScreenQuadVAO = BuildScreenVAO();
        char *ShaderSource = Win32ReadFileToMemory(App->ShaderFilename, 0);
        App->ShaderLastWriteTime = GetFileLastWriteTime(App->ShaderFilename);
        if (!ShaderSource) 
        {
            printf("can't find shader file\n");
        }
        
        char Buffer[1024] = {};
        string ErrorString = STACK_STRING(Buffer);
        
        App->Program = CompileShaderProgram(ShaderSource, ErrorString);
        if (ErrorString.E[0]) ErrorMessageBox(ErrorString.E);
        
        App->LastShaderSource = ShaderSource;
        
        App->IsInitialized = true;
    }
    
    if (FileHasBeenUpdated(App->ShaderFilename, App->ShaderLastWriteTime))
    {
        App->ShaderLastWriteTime = GetFileLastWriteTime(App->ShaderFilename);
        char *NewShaderSource = Win32ReadFileToMemory(App->ShaderFilename, 0);
        
        char Buffer[1024];
        string ErrorString = STACK_STRING(Buffer);
        
        GLuint NewProgram = CompileShaderProgram(NewShaderSource, ErrorString, false);
        
        if (NewProgram)
        {
            glDeleteProgram(App->Program);
            Win32FreeFileMemory(App->LastShaderSource);
            
            App->LastShaderSource = NewShaderSource;
            App->Program = NewProgram;
        }
        else
        {
            ErrorMessageBox(ErrorString.E);
            Win32FreeFileMemory(NewShaderSource);
        }
    }
    
    App->TimeInSeconds += dT;
    
    glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);
    
    glUseProgram(App->Program);
    glUploadVec2(App->Program, "uResolution", V2(WindowWidth, WindowHeight));
    glUploadFloat(App->Program, "uTime", App->TimeInSeconds);
    glBindVertexArray(App->ScreenQuadVAO);
    glDrawArrays(GL_TRIANGLES, 0, 6);
    glBindVertexArray(0);
}