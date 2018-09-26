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
    FragColor = vec4(0.0, 0.0, 0.0, 1.0);
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

internal GLuint
UploadHdrMap(char *Path)
{
    GLuint HdrMap = 0;
    glGenTextures(1, &HdrMap);
    glBindTexture(GL_TEXTURE_2D, HdrMap);
    {
        int Width, Height, ChannelCount;
        f32 *Data = stbi_loadf(Path, &Width, &Height, &ChannelCount, 0);
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB16F, Width, Height, 
                     0, GL_RGB, GL_FLOAT, Data);
        stbi_image_free(Data);
    }
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_R, GL_CLAMP_TO_EDGE);  
    glBindTexture(GL_TEXTURE_2D, 0);
    return HdrMap;
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
RewindAppState(app_state *App)
{
    App->TimeInSeconds = 0.0f;
    App->FrameIndex = 0;
    App->CurrentBufferIndex = 0;
    
    glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
    glBindFramebuffer(GL_READ_FRAMEBUFFER, App->Buffers[0].Handle);
    glClear(GL_COLOR_BUFFER_BIT);
    glBindFramebuffer(GL_READ_FRAMEBUFFER, App->Buffers[1].Handle);
    glClear(GL_COLOR_BUFFER_BIT);
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
            printf("can't find shader file or it is empty :(\n");
        }
        
        char Buffer[1024] = {};
        string ErrorString = STACK_STRING(Buffer);
        App->Program = CompileShaderProgram(ShaderSource, ErrorString);
        App->LastShaderSource = ShaderSource;
        
        stbi_set_flip_vertically_on_load(true);
        App->GraceHdrMap = UploadHdrMap("../data/grace-new.hdr");
        App->GlacierHdrMap = UploadHdrMap("../data/glacier.hdr");
        App->UffiziHdrMap = UploadHdrMap("../data/uffizi-large.hdr");
        App->EnnisHdrMap = UploadHdrMap("../data/ennis.hdr");
        App->PisaHdrMap = UploadHdrMap("../data/pisa.hdr");
        App->DogeHdrMap = UploadHdrMap("../data/doge2.hdr");
        
        App->IsInitialized = true;
    }
    
    if (App->BufferWidth != WindowWidth || App->BufferHeight != WindowHeight)
    {
        App->BufferWidth = WindowWidth;
        App->BufferHeight = WindowHeight;
        RewindAppState(App);
        
        for (int BufferIndex = 0; BufferIndex < ARRAY_COUNT(App->Buffers); ++BufferIndex)
        {
            GLuint *BufferHandle = &App->Buffers[BufferIndex].Handle;
            GLuint *BufferTexture = &App->Buffers[BufferIndex].Texture;
            GLuint *BufferRenderbuffer = &App->Buffers[BufferIndex].Renderbuffer;
            
            if (*BufferHandle)
            {
                glDeleteFramebuffers(1, BufferHandle);
            }
            if (*BufferTexture)
            {
                glDeleteTextures(1, BufferTexture);
            }
            if (*BufferRenderbuffer)
            {
                glDeleteRenderbuffers(1, BufferRenderbuffer);
            }
            
            glGenFramebuffers(1, BufferHandle);
            glBindFramebuffer(GL_FRAMEBUFFER, *BufferHandle);
            
            //bind color attachment
            glGenTextures(1, BufferTexture);
            glBindTexture(GL_TEXTURE_2D, *BufferTexture);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);	
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
            glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, WindowWidth, WindowHeight, 0, 
                         GL_RGB, GL_UNSIGNED_BYTE, 0);
            glBindTexture(GL_TEXTURE_2D, 0);
            glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, 
                                   GL_TEXTURE_2D, *BufferTexture, 0); 
            
            //render buffer
            glGenRenderbuffers(1, BufferRenderbuffer);
            glBindRenderbuffer(GL_RENDERBUFFER, *BufferRenderbuffer);
            glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH24_STENCIL8, WindowWidth, WindowHeight);  
            glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_STENCIL_ATTACHMENT, 
                                      GL_RENDERBUFFER, *BufferRenderbuffer);  
            glBindRenderbuffer(GL_RENDERBUFFER, 0);
            
            GLenum Completeness = glCheckFramebufferStatus(GL_FRAMEBUFFER);
            ASSERT(Completeness == GL_FRAMEBUFFER_COMPLETE); //GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT
            glBindFramebuffer(GL_FRAMEBUFFER, 0);
            
            glBindFramebuffer(GL_FRAMEBUFFER, *BufferHandle);
            glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
            glClear(GL_COLOR_BUFFER_BIT);
            glBindFramebuffer(GL_FRAMEBUFFER, 0);
        }
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
            Win32FreeFileMemory(NewShaderSource);
        }
    }
    
    glBindFramebuffer(GL_FRAMEBUFFER, 0);
    glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);
    
    int CurrentBufferIndex = App->CurrentBufferIndex;
    int LastBufferIndex = (App->CurrentBufferIndex + 1) % 2;
    
    glBindFramebuffer(GL_FRAMEBUFFER, App->Buffers[CurrentBufferIndex].Handle);
    
    glUseProgram(App->Program);
    {
        glUploadVec2(App->Program, "uResolution", V2(WindowWidth, WindowHeight));
        glUploadFloat(App->Program, "uTime", App->TimeInSeconds);
        glUploadInt32(App->Program, "uFrameIndex", App->FrameIndex);
        
        glActiveTexture(GL_TEXTURE0);
        glBindTexture(GL_TEXTURE_2D, App->Buffers[LastBufferIndex].Texture);
        glUniform1i(glGetUniformLocation(App->Program, "uPrevFrame"), 0);
        
        glActiveTexture(GL_TEXTURE1);
        glBindTexture(GL_TEXTURE_2D, App->GraceHdrMap);
        glUniform1i(glGetUniformLocation(App->Program, "GraceCathedral"), 1);
        glActiveTexture(GL_TEXTURE2);
        glBindTexture(GL_TEXTURE_2D, App->GlacierHdrMap);
        glUniform1i(glGetUniformLocation(App->Program, "Glacier"), 2);
        glActiveTexture(GL_TEXTURE3);
        glBindTexture(GL_TEXTURE_2D, App->GlacierHdrMap);
        glUniform1i(glGetUniformLocation(App->Program, "UffiziGallery"), 3);
        glActiveTexture(GL_TEXTURE4);
        glBindTexture(GL_TEXTURE_2D, App->EnnisHdrMap);
        glUniform1i(glGetUniformLocation(App->Program, "EnnisDiningRoom"), 4);
        glActiveTexture(GL_TEXTURE5);
        glBindTexture(GL_TEXTURE_2D, App->PisaHdrMap);
        glUniform1i(glGetUniformLocation(App->Program, "PisaCourtyard"), 5);
        glActiveTexture(GL_TEXTURE6);
        glBindTexture(GL_TEXTURE_2D, App->DogeHdrMap);
        glUniform1i(glGetUniformLocation(App->Program, "DogeCourtyard"), 6);
        
        glBindVertexArray(App->ScreenQuadVAO);
        glDrawArrays(GL_TRIANGLES, 0, 6);
        glBindVertexArray(0);
    }
    
    glBindFramebuffer(GL_FRAMEBUFFER, 0);
    
    glBindFramebuffer(GL_READ_FRAMEBUFFER, App->Buffers[CurrentBufferIndex].Handle);
    glBlitFramebuffer(0, 0, WindowWidth, WindowHeight, 0, 0, WindowWidth, WindowHeight,
                      GL_COLOR_BUFFER_BIT, GL_NEAREST);
    
    App->TimeInSeconds += dT;
    App->FrameIndex += 1;
    App->CurrentBufferIndex = (App->CurrentBufferIndex + 1) % 2;
}
