import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec, execFile } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true
  });

  // Load the app (always dev mode when using electron:dev)
  mainWindow.loadURL('http://localhost:5173');
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handler for scanning emails
ipcMain.handle('scan-email', async () => {
  return new Promise((resolve, reject) => {
    const backendPath = join(__dirname, '../../backend');
    // Force the exact java executable to use JDK-21
    const javaExec = "C:\\Program Files\\Java\\jdk-21\\bin\\java.exe";
    const classpath = ".;jakarta.activation-2.0.1.jar;jakarta.mail-2.0.1.jar";
    
    const env = {
      ...process.env,
      email_address: process.env.EMAIL_ADDRESS || process.env.email_address,
      email_password: process.env.EMAIL_PASSWORD || process.env.email_password
    };
    
    console.log('Environment check:', {
      EMAIL_ADDRESS: process.env.EMAIL_ADDRESS,
      email_address: env.email_address,
      hasPassword: !!env.email_password
    });

    // Use execFile to avoid shell parsing and ensure the exact java executable is launched
    const javaArgs = ['-cp', classpath, 'Main'];
    execFile(javaExec, javaArgs, { cwd: backendPath, env }, (error, stdout, stderr) => {
      console.log('=== JAVA EXECUTION ===');
      console.log('Working directory:', backendPath);
      console.log('Email from env:', env.email_address);
      console.log('Java executable:', javaExec);
      console.log('Java args:', javaArgs.join(' '));
      
      if (error) {
        console.error('Execution error:', error);
        console.error('stderr:', stderr);
        reject({ error: error.message, stderr, stdout });
        return;
      }

      if (stderr) {
        console.error('stderr:', stderr);
      }

      console.log('=== STDOUT ===');
      console.log(stdout);
      console.log('=== END STDOUT ===');
      
      // Parse the Java output
      const result = parseJavaOutput(stdout);
      console.log('Parsed result:', result);
      resolve(result);
    });
  });
});

function parseJavaOutput(output) {
  const lines = output.split('\n');
  const urls = [];
  let isConnected = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('Connected Successfully!')) {
      isConnected = true;
    }
    
    if (line.startsWith('Checking URL:')) {
      const url = line.replace('Checking URL:', '').trim();
      const nextLine = lines[i + 1]?.trim() || '';
      
      const isPhishing = nextLine.includes('PHISHING URL FOUND');
      const isSafe = nextLine.includes('Not in OpenPhish feed');
      
      urls.push({
        url,
        status: isPhishing ? 'phishing' : (isSafe ? 'safe' : 'unknown')
      });
    }
  }

  return {
    connected: isConnected,
    urls,
    rawOutput: output
  };
}