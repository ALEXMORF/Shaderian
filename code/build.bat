@echo off

IF NOT EXIST ..\build mkdir ..\build

pushd ..\build
ctime -begin shaderian.ctm
set CompilerFlags=-FC -Feshaderian -nologo -Z7 -W4 -WX -wd4005 -wd4505 -wd4100 -wd4189 -wd4201
set LinkerFlags=user32.lib gdi32.lib opengl32.lib 
cl %CompilerFlags% ..\code\win32_shaderian.cpp %LinkerFlags%
ctime -end shaderian.ctm
popd