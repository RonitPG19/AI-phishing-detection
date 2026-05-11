import os
import json
import sys
import re
import logging
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import importlib.util

# =================================================================
# PRODUCTION LOGGING SETUP
# =================================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ai_agent.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("PhishingAIAgent")

# =================================================================
# DEPENDENCY CHECK
# =================================================================
try:
    from groq import Groq
except ImportError:
    logger.error("Groq library not found. Install it via 'pip install groq'.")
    sys.exit(1)

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

# =================================================================
# PATHS AND MODULE LOADING
# =================================================================
BASE_DIR = Path(__file__).resolve().parent.parent / "Main"
OFFICE_DIR = BASE_DIR / "Office"

def load_module(module_name: str, module_path: Path):
    if not module_path.exists(): return None
    try:
        spec = importlib.util.spec_from_file_location(module_name, module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    except Exception: return None

office_module = load_module("identify_malicious_office", OFFICE_DIR / "identify_malicious_office.py")

# Enhanced regex to catch critical short tags (/JS, obj, etc)
ASCII_STRING_REGEX = re.compile(rb"[\x20-\x7e]{3,}")
URL_REGEX = re.compile(r"https?://[^\s<>()\"'\\]+", re.IGNORECASE)

class PhishingAIAgent:
    def __init__(self):
        self.api_key = os.environ.get("GROQ_API_KEY")
        if not self.api_key:
            logger.error("GROQ_API_KEY environment variable is not set.")
            sys.exit(1)
        self.client = Groq(api_key=self.api_key)
        self.model_name = "llama-3.3-70b-versatile" 

    def _get_raw_strings(self, data: bytes) -> List[str]:
        return [m.decode("latin-1", errors="ignore") for m in ASCII_STRING_REGEX.findall(data)]

    def _get_visual_text(self, file_path: Path) -> str:
        if not fitz: return "[PyMuPDF not installed]"
        try:
            doc = fitz.open(file_path)
            text = "".join([page.get_text() for page in doc[:2]])
            doc.close()
            return text.strip() if text.strip() else "[EMPTY/BLANK DOCUMENT]"
        except Exception:
            return "[UNREADABLE VISUAL CONTENT]"

    # ---------------------------------------------------------
    # TOOL 1: UNIVERSAL EXTRACTION PIPELINE
    # ---------------------------------------------------------
    
    def run_extraction_pipeline(self, file_path: Path) -> str:
        """Irrespective of extension, performs deep forensic hunting."""
        visual_text = self._get_visual_text(file_path)
        raw_bytes = file_path.read_bytes()
        raw_strings = self._get_raw_strings(raw_bytes)
        urls = list(set(URL_REGEX.findall(raw_bytes.decode("latin-1", errors="ignore"))))
        
        # Universal keyword-aware hunting across ALL objects and strings
        forensic_list = [s for s in raw_strings if any(k in s for k in [
            "obj", "<<", "OpenAction", "JS", "JavaScript", "/Action", "stream",
            "VBA", "AutoOpen", "cmd", "powershell", "shell", "WScript", "http",
            "VirtualAlloc", "CreateProcess", "DownloadFile"
        ])]
        
        # Fallback if no critical keywords found, take first 50 headers/objects
        if not forensic_list:
            forensic_list = [s for s in raw_strings if "obj" in s or "<<" in s][:50]
        
        # Special case: If it's an Office/OLE file, add the macro report
        if office_module and file_path.suffix.lower() in {".doc", ".xls", ".ole", ".docx", ".xlsx"}:
            try:
                office_report = office_module.analyze_document(file_path)
                forensic_list.insert(0, f"Office Macro Report: {json.dumps(office_report.get('object_tag_stats', {}))}")
            except Exception: pass

        forensic_data = {
            "urls": urls,
            "suspicious_metadata": list(set(forensic_list))[:100] # Generous forensic sample
        }

        return f"=== VISUAL TEXT (READABLE) ===\n{visual_text}\n\n=== FORENSIC DATA (HIDDEN STRINGS & URLs) ===\n{json.dumps(forensic_data, indent=4)}"

    # ---------------------------------------------------------
    # TOOL 2: LLM TOOL (With Retry Logic)
    # ---------------------------------------------------------
    
    def call_llm_analyzer(self, formatted_context: str, retries=3) -> Dict[str, Any]:
        prompt = f"""
        System: You are an elite Cyber-Forensics AI. 
        Task: Analyze the 'Visual' and 'Forensic' sections to detect malicious intent.
        
        GOLDEN RULES:
        1. BLANK DOCUMENTS: If VISUAL TEXT is [EMPTY/BLANK DOCUMENT] but FORENSIC DATA contains suspicious code, it is 100% MALICIOUS.
        2. AUTO-EXECUTION: Look for 'OpenAction', 'JS', 'AutoOpen', or shell commands.
        3. LOGIC GAPS: A file with no visible text that has complex hidden streams is highly suspicious.
        
        {formatted_context}

        Response Format (JSON only):
        {{
            "is_malicious": true/false,
            "predicted_behavior": "Detailed logic of the threat",
            "technical_reason": "Specific red flags found",
            "reason": "Final summary verdict"
        }}
        """
        for i in range(retries):
            try:
                completion = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    response_format={"type": "json_object"}
                )
                return json.loads(completion.choices[0].message.content)
            except Exception as e:
                if "429" in str(e):
                    wait_time = (i + 1) * 5
                    logger.warning(f"Rate limit hit. Waiting {wait_time}s to retry...")
                    time.sleep(wait_time)
                    continue
                break
        return {"is_malicious": False, "reason": "Analysis failed due to API errors."}

    def process_attachment(self, file_path: Path) -> Optional[Dict[str, Any]]:
        try:
            logger.info(f"Processing: {file_path.name}")
            formatted_context = self.run_extraction_pipeline(file_path)
            analysis = self.call_llm_analyzer(formatted_context)
            
            return {
                "filename": file_path.name,
                "status": "malicious" if analysis.get("is_malicious") else "benign",
                "predicted_behavior": analysis.get("predicted_behavior", "N/A"),
                "technical_reason": analysis.get("technical_reason", "N/A"),
                "threat_summary": analysis.get("reason", "benign")
            }
        except Exception: return None

def main():
    if len(sys.argv) < 2: return
    input_path = Path(sys.argv[1])
    agent = PhishingAIAgent()
    files = [f for f in input_path.rglob("*") if f.is_file() and f.suffix not in [".json", ".log"]]
    
    results = []
    for f in files:
        res = agent.process_attachment(f)
        if res: results.append(res)

    with open(input_path / "final_phishing_report.json", "w") as f:
        json.dump({"total_attachments_reviewed": len(files), "analysis_results": results}, f, indent=4)
    print(f"[+] Done. Processed {len(files)} files.")

if __name__ == "__main__":
    main()
