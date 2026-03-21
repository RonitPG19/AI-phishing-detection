# Using the bundled runner to force a specific Java executable

These helper scripts force the Java executable to `C:\Program Files\Java\jdk-21\bin\java.exe` (and `javac.exe` from the same folder) when compiling/running the Java code in this `backend/` folder.

Files added:

- `run-java.ps1` — PowerShell script. Changes into `backend/`, compiles `Main.java` (unless `-NoCompile`), and runs `Main` with the hard-coded JDK bin path.
- `run-java.bat` — Windows batch wrapper doing the same for cmd / Explorer.

Usage (PowerShell):

```powershell
cd path\to\phishing-scanner-app\backend
# Run (compiles then runs):
.\run-java.ps1

# If your system blocks execution policies, run with bypass:
powershell -ExecutionPolicy Bypass -File .\run-java.ps1

# Skip compilation if you already compiled the classes:
.\run-java.ps1 -NoCompile
```

Usage (double-click or cmd):

```bat
cd path\to\phishing-scanner-app\backend
run-java.bat
```

If the JDK is not present at `C:\Program Files\Java\jdk-21`, the scripts will report an error. You can edit the `JDK` path in `run-java.bat` or the `$javaPath` variable in `run-java.ps1` to point to a different JDK location.
