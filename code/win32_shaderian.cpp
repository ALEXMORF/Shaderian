#include "kernel.h"
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
typedef uint8_t u8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef uint64_t u64;
typedef int8_t i8;
typedef int16_t i16;
typedef int32_t i32;
typedef int64_t i64;
typedef float f32;
typedef double f64;
typedef bool b8;
typedef int b32;
#define internal static
#define global_variable static
#define local_persist static
#define ASSERT(Value) do { if (!(Value)) *(int *)0 = 0; } while (0)
#include "win32_kernel.h"
#include "shaderian.cpp"

global_variable b32 gAppIsRunning;
global_variable int gWindowWidth;
global_variable int gWindowHeight;

LRESULT CALLBACK
Win32WindowCallback(HWND Window, UINT Message, WPARAM Wparam, LPARAM Lparam)
{
    LRESULT Result = 0;
    switch (Message)
    {
        case WM_CLOSE:
        case WM_QUIT:
        {
            gAppIsRunning = false;
        } break;
        
        case WM_ACTIVATE:
        {
            WORD IsActive = LOWORD(Wparam) == WA_ACTIVE;
            SetLayeredWindowAttributes(Window, 0, IsActive? 255: 100, LWA_ALPHA);
        } break;
        
        case WM_SIZE:
        {
            gWindowWidth = LOWORD(Lparam);
            gWindowHeight = HIWORD(Lparam);
            if (glViewport)
            {
                glViewport(0, 0, gWindowWidth, gWindowHeight);
            }
        } break;
        
        default:
        {
            Result = DefWindowProc(Window, Message, Wparam, Lparam);
        } break;
    }
    return Result;
}

int main(int ArgumentCount, char **ArgumentList) 
{
    f32 TargetFPS = 60.0f;
    f32 TargetElapsedTimeInMS = 1000.0f / 60.0f;
    
    if (ArgumentCount != 2)
    {
        printf("Usage: shaderian [fragment shader file]\n");
        return -1;
    }
    char *ShaderFilename = ArgumentList[1];
    
    //initialize platform stuff
    HINSTANCE InstanceHandle = GetModuleHandle(0);
    HWND Window = Win32CreateWindow(InstanceHandle, 1200, 800, 
                                    "Shaderian", "Shaderian Class", 
                                    Win32WindowCallback);
    if (!Window)
    {
        ErrorMessageBox("Couldn't create a window");
        return -1;
    }
    //extra styling on our window to make it transparent 
    SetWindowLong(Window, GWL_EXSTYLE, WS_EX_LAYERED);
    
    //opengl stuff
    int OpenglMajorVersion = 3;
    int OpenglMinorVersion = 3;
    if (!Win32InitializeOpengl(GetDC(Window), OpenglMajorVersion, OpenglMinorVersion))
    {
        char ErrorMessage[250];
        snprintf(ErrorMessage, sizeof(ErrorMessage), "Couldn't create OpenGL context version %d.%d", 
                 OpenglMajorVersion, OpenglMinorVersion);
        ErrorMessageBox(ErrorMessage);
        return -1;
    }
    LoadGLFunctions(Win32GetOpenglFunction);
    
    
    
    //application loop
    app_state AppState = {};
    AppState.ShaderFilename = ShaderFilename;
    gAppIsRunning = true;
    f32 LastFrameTimeInS = 0.0f;
    while (gAppIsRunning)
    {
        u64 BeginCounter = Win32GetPerformanceCounter();
        
        MSG Message;
        while (PeekMessage(&Message, 0, 0, 0, PM_REMOVE))
        {
            switch (Message.message)
            {
                case WM_KEYDOWN:
                case WM_KEYUP:
                case WM_SYSKEYDOWN:
                case WM_SYSKEYUP:
                {
                    b32 KeyIsDown = (Message.lParam & (1 << 31)) == 0;
                    b32 KeyWasDown = (Message.lParam & (1 << 30)) != 0;
                    b32 AltIsDown = (Message.lParam & (1 << 29)) != 0;
                    
                    if (KeyWasDown != KeyIsDown)
                    {
                        if (KeyIsDown)
                        {
                            if (Message.wParam == VK_ESCAPE)
                            {
                                gAppIsRunning = false;
                            }
                            
                            if (AltIsDown && Message.wParam == VK_F4)
                            {
                                gAppIsRunning = false;
                            }
                            
                            if (AltIsDown && Message.wParam == VK_RETURN)
                            {
                                Win32ToggleFullscreen(Window);
                            }
                        }
                    }
                } break;
                
                default:
                {
                    TranslateMessage(&Message);
                    DispatchMessage(&Message);
                } break;
            }
            
        }
        
        AppUpdateAndRender(&AppState, LastFrameTimeInS, gWindowWidth, gWindowHeight);
        SwapBuffers(GetDC(Window));
        
        u64 ElapsedCounter = Win32GetPerformanceCounter();
        f32 ElapsedTimeInMS = Win32GetTimeElapsedInMS(BeginCounter, ElapsedCounter);
        if (ElapsedTimeInMS < TargetElapsedTimeInMS)
        {
            Sleep((LONG)(TargetElapsedTimeInMS - ElapsedTimeInMS));
            while (Win32GetTimeElapsedInMS(BeginCounter, Win32GetPerformanceCounter()) < TargetElapsedTimeInMS);
        }
        
        u64 EndCounter = Win32GetPerformanceCounter();
        LastFrameTimeInS = Win32GetTimeElapsedInMS(BeginCounter, EndCounter) / 1000.0f;
        
        char Buffer[50];
        snprintf(Buffer, sizeof(Buffer), "Shaderian, elapsed time: %.2fms", LastFrameTimeInS*1000.0f);
        SetWindowText(Window, Buffer);
    }
    
    return 0;
}

