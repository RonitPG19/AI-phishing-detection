# 🛡️ AI-Powered Phishing Detection Agent
**Production-Grade Forensic Analysis & Behavioral Prediction**

## 📖 Overview
The **Phishing Detection AI Agent** is a production-ready security tool designed to identify malicious email attachments using a combination of **Deep Static Extraction** and **High-Performance LLM Reasoning (Llama 3.3 70B)**. 

Unlike traditional signature-based antivirus, this agent performs "Logical Contradiction Analysis"—comparing a file's visual purpose against its hidden technical skeleton to predict malicious intent before execution.

---

## 🚀 Key Features
*   **Universal Forensic Scanner**: Performs deep keyword-aware hunting across ALL files, regardless of extension or obfuscation.
*   **Logical Contrast Engine**: Detects "Silent Droppers" by comparing visual text (or lack thereof) against background execution triggers (e.g., Blank Page + OpenAction).
*   **Resilient API Architecture**: Implements automatic **Exponential Backoff & Retry** logic to handle high-volume analysis without failing due to rate limits.
*   **Multi-Vector Detection**: Specifically tuned to catch:
    *   **PDF**: Auto-run chains (`/OpenAction`, `/JavaScript`, `/Launch`).
    *   **Office/OLE**: Malicious VBA macros and DDE execution.
    *   **Executables**: Suspicious API calls (`VirtualAlloc`, `CreateProcess`).
    *   **SVG/XML**: Malicious redirects and embedded scripts.
*   **Zero-Risk Analysis**: Operates exclusively in **Binary Read-Only Mode (`rb`)**, ensuring malicious payloads are never triggered during analysis.

---

## 🛠️ Installation & Setup

### 1. Prerequisites
*   Python 3.8+
*   Groq API Key (from [console.groq.com](https://console.groq.com))

### 2. Install Dependencies
```powershell
pip install groq pymupdf
```

### 3. Set Environment Variables
```powershell
$env:GROQ_API_KEY="your_groq_api_key_here"
```

---

## 💻 Usage
Run the agent against any folder containing attachments:
```powershell
python d:\MAJOR\AI\ai_agent.py "path/to/attachments"
```

### Output
The agent generates a `final_phishing_report.json` in the target folder, containing:
*   **Verdict**: Malicious or Benign.
*   **Predicted Behavior**: A step-by-step logic of what the file *would* do if executed.
*   **Technical Reason**: Evidence-based justifications (e.g., "OpenAction detected in blank document").
*   **URL Extraction**: All links found within the file for further SOC review.

## 🛠️ AI Agent Tools
The agent orchestrates several specialized forensic tools to build its intelligence report:

1.  **Universal Forensic Extractor**: A high-speed binary scanner that hunts for malicious keywords (`PowerShell`, `VirtualAlloc`, `Shell`) and URLs across any file type, regardless of extension.
2.  **Visual Context Engine (PyMuPDF)**: Extracts the "human-readable" layer of a document. Used to detect "Bait" documents that appear blank to the user but contain hidden code.
3.  **PDF Structural Mapper**: Deep-scans the PDF object tree to find hidden `/OpenAction` and `/JavaScript` execution chains.
4.  **Office Macro Analyzer**: Utilizes OLE analysis to detect malicious VBA macros, DDE triggers, and `AutoOpen` scripts inside Word, Excel, and OLE files.
5.  **LLM Behavioral Predictor (Llama 3.3 70B)**: The "Brain" of the agent. It synthesizes all tool outputs to simulate the file's execution logic and provide a natural language threat verdict.

---

## 🏗️ Technical Architecture

### 1. Extraction Pipeline
The agent uses its toolset to search for:
*   **Structural Objects**: Headers like `obj`, `<<`, `stream`.
*   **Execution Triggers**: `OpenAction`, `AutoOpen`, `JS`.
*   **Command Strings**: `powershell`, `cmd`, `WScript`.
*   **Network Artifacts**: Scans for embedded URLs and domains.

### 2. Context Formatting
Data is synthesized into a standardized forensic report for the LLM:
```text
=== VISUAL TEXT (READABLE) ===
[Human-readable content]

=== FORENSIC DATA (HIDDEN STRINGS & URLs) ===
[Structured Metadata Skeleton]
```

### 3. LLM Reasoning (The Brain)
The Llama 3.3 70B model acts as a "Digital Pathologist," analyzing the relationship between the two sections. It looks for **Logic Gaps** (e.g., "Why does an empty PDF have a 500-byte JavaScript stream?").

---

## 📂 Project Structure
*   `AI/ai_agent.py`: The main orchestration and LLM engine.
*   `AI/extract_pdf_strings.py`: Standalone tool for deep PDF forensic inspection.
*   `Main/Office/`: Specialized static analysis for Microsoft Office files.
*   `Main/PDF/`: Structural entropy and feature mapping for PDFs.

---

## 🔒 Security Disclaimer
This tool is for forensic and educational purposes. While it operates in a safe, read-only environment, always handle known malware samples within a sandboxed virtual machine for maximum security.
