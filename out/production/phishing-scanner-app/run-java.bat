@echo off
set "JDK=C:\Program Files\Java\jdk-21\bin"
set "CP=.;*"

echo Using JDK bin: %JDK%
if not exist "%JDK%\javac.exe" (
  echo ERROR: javac not found at %JDK%\javac.exe
  pause
  exit /b 1
)

"%JDK%\javac.exe" -cp "%CP%" Main.java
if errorlevel 1 (
  echo Compilation failed.
  pause
  exit /b %errorlevel%
)

"%JDK%\java.exe" -cp "%CP%" Main
pause
