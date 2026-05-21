import os
import json
import sys
import re
import logging
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import importlib.util
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

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

try:
    import cv2
except ImportError:
    cv2 = None

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

    def _decode_qr_links(self, raw_bytes: bytes) -> List[str]:
        if not cv2:
            return []
        try:
            import numpy as np
            arr = np.frombuffer(raw_bytes, np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is None:
                return []
            detector = cv2.QRCodeDetector()
            # First try multi decode
            try:
                data, points, _ = detector.detectAndDecodeMulti(img)
                if isinstance(data, (list, tuple)):
                    decoded = [d for d in data if d]
                elif isinstance(data, str) and data:
                    decoded = [data]
                else:
                    decoded = []
            except Exception:
                decoded = []
            if not decoded:
                result = detector.detectAndDecode(img)
                if isinstance(result, tuple):
                    if len(result) >= 1:
                        single = result[0]
                    else:
                        single = ""
                else:
                    single = result
                if single:
                    decoded = [single]
            return decoded
        except Exception:
            return []

    def _get_combined_keyword_list(self) -> List[str]:
        return [
            "OpenAction", "/JS", "JavaScript", "/Action",
            "VBA", "AutoOpen", "cmd", "powershell", "shell", "WScript",
            "VirtualAlloc", "CreateProcess", "DownloadFile", "ddeauto", "dde",
            "script", "http"
        ]

    def _get_openxml_word_text(self, file_path: Path) -> Optional[str]:
        try:
            from zipfile import ZipFile
            with ZipFile(file_path, "r") as archive:
                if "word/document.xml" in archive.namelist():
                    document_xml = archive.read("word/document.xml").decode("utf-8", errors="ignore")
                    cleaned = re.sub(r"<[^>]+>", " ", document_xml)
                    words = re.split(r"\s+", cleaned.strip())
                    return " ".join(words[:50])
        except Exception:
            pass
        return None

    def _get_openxml_excel_fields(self, file_path: Path) -> Optional[List[str]]:
        try:
            from zipfile import ZipFile
            with ZipFile(file_path, "r") as archive:
                if "xl/sharedStrings.xml" in archive.namelist():
                    shared_xml = archive.read("xl/sharedStrings.xml").decode("utf-8", errors="ignore")
                    string_values = re.findall(r"<t[^>]*>(.*?)</t>", shared_xml, re.DOTALL)
                    cleaned = [re.sub(r"\s+", " ", s).strip() for s in string_values if s.strip()]
                    return list(dict.fromkeys(cleaned))[:5]
                fields = []
                for member in archive.namelist():
                    if member.startswith("xl/worksheets/") and member.endswith(".xml"):
                        worksheet_xml = archive.read(member).decode("utf-8", errors="ignore")
                        values = re.findall(r"<t[^>]*>(.*?)</t>", worksheet_xml, re.DOTALL)
                        for value in values:
                            cleaned = re.sub(r"\s+", " ", value).strip()
                            if cleaned and cleaned not in fields:
                                fields.append(cleaned)
                            if len(fields) >= 5:
                                break
                        if len(fields) >= 5:
                            break
                return fields[:5] if fields else None
        except Exception:
            pass
        return None

    def _get_word_preview(self, file_path: Path, raw_bytes: bytes, raw_strings: List[str]) -> str:
        suffix = file_path.suffix.lower()
        if suffix in {".docx", ".docm"} or b"word/document.xml" in raw_bytes[:65536]:
            preview = self._get_openxml_word_text(file_path)
            if preview:
                return preview
        if suffix in {".doc", ".ole"}:
            words = re.split(r"\s+", " ".join(raw_strings))
            return " ".join(words[:50])
        return ""

    def _get_excel_top_fields(self, file_path: Path, raw_bytes: bytes, raw_strings: List[str]) -> List[str]:
        suffix = file_path.suffix.lower()
        if suffix in {".xlsx", ".xlsm"} or b"xl/sharedStrings.xml" in raw_bytes[:65536]:
            fields = self._get_openxml_excel_fields(file_path)
            if fields:
                return fields
        if suffix in {".xls", ".ole"}:
            candidates = []
            for s in raw_strings:
                cleaned = s.strip()
                if cleaned and len(cleaned) <= 80 and cleaned not in candidates:
                    candidates.append(cleaned)
                if len(candidates) >= 5:
                    break
            return candidates
        return []

    # ---------------------------------------------------------
    # TOOL 1: UNIVERSAL EXTRACTION PIPELINE
    # ---------------------------------------------------------
    
    def run_extraction_pipeline(self, file_path: Path) -> str:
        """Irrespective of extension, performs deep forensic hunting."""
        raw_bytes = file_path.read_bytes()
        suffix = file_path.suffix.lower()
        decoded_content = raw_bytes.decode("latin-1", errors="ignore")
        is_zip = raw_bytes.startswith(b"PK\x03\x04")
        zip_members = set()
        image_like = suffix in {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff"}
        svg_like = suffix == ".svg" or b"<svg" in raw_bytes[:4096]
        visual_text = self._get_visual_text(file_path)
        if image_like or svg_like:
            visual_text = "[IMAGE/SVG FILE - VISUAL TEXT EXCLUDED FROM ANALYSIS]"

        if is_zip:
            from zipfile import ZipFile, BadZipFile
            zip_strings = []
            try:
                with ZipFile(file_path, "r") as archive:
                    for member_name in archive.namelist():
                        zip_members.add(member_name)
                        try:
                            member_bytes = archive.read(member_name)
                            zip_strings.extend(self._get_raw_strings(member_bytes))
                            zip_strings.append(member_name)
                        except Exception:
                            continue
            except BadZipFile:
                pass
            raw_strings = list(set(zip_strings))
        else:
            raw_strings = self._get_raw_strings(raw_bytes)

        urls = list(set(URL_REGEX.findall(decoded_content)))
        if is_zip:
            member_urls = []
            for s in raw_strings:
                member_urls.extend(URL_REGEX.findall(s))
            urls = list(set(urls + member_urls))
        links = urls
        decoded_qr_links: List[str] = []
        if image_like:
            decoded_qr_links = self._decode_qr_links(raw_bytes)
            if decoded_qr_links:
                links = list(dict.fromkeys(links + decoded_qr_links))
        keywords = self._get_combined_keyword_list()
        forensic_list = [
            s for s in raw_strings if any(k.lower() in s.lower() for k in keywords)
        ]
        if not forensic_list:
            forensic_list = [s for s in raw_strings if "obj" in s.lower() or "<<" in s.lower()][:50]

        is_pdf = suffix == ".pdf" or b"%PDF" in raw_bytes[:1024]
        html_like = svg_like or any(marker in raw_bytes[:4096].lower() for marker in [b"<html", b"<?xml"])
        office_like = suffix in {".doc", ".xls", ".ole", ".docx", ".xlsx", ".docm", ".xlsm"} or any(
            marker in raw_bytes[:65536] for marker in [b"word/document.xml", b"xl/sharedStrings.xml"]
        )

        red_flags = []
        ole_extensions = {".ole", ".doc", ".xls", ".ppt"}
        openxml_extensions = {".docx", ".xlsx", ".pptx", ".docm", ".xlsm"}
        if suffix in ole_extensions and is_zip:
            red_flags.append(f"CRITICAL: FILE EXTENSION MISMATCH — file claims to be '{suffix}' (legacy OLE binary) but is actually a ZIP/OpenXML container. This is a known evasion technique to bypass security filters.")
        if suffix in openxml_extensions and not is_zip:
            red_flags.append(f"CRITICAL: FILE EXTENSION MISMATCH — file claims to be '{suffix}' (OpenXML) but does NOT have a ZIP structure. Possible binary payload disguised as an Office document.")

        if office_module and office_like:
            try:
                office_report = office_module.analyze_document(file_path)
                tag_stats = office_report.get('object_tag_stats', {})
                tag_flags = tag_stats.get('tag_flags', {})
                file_type = office_report.get('file_type_summary', {})
                forensic_list.insert(0, f"Office Macro Report: {json.dumps(tag_stats)}")
                forensic_list.insert(0, f"Office Tag Flags: {json.dumps(tag_flags)}")
                forensic_list.insert(0, f"Office File Type: {json.dumps(file_type)}")

                if tag_flags.get('has_macros'):
                    red_flags.append("CRITICAL: MACROS DETECTED — the file contains embedded macro code (VBA/scripts).")
                if tag_flags.get('has_autoexec_macro'):
                    red_flags.append("CRITICAL: AUTO-EXECUTE MACRO — macros will run automatically when the file is opened.")
                if tag_flags.get('has_external_urls'):
                    red_flags.append("WARNING: EXTERNAL URLs — the file references external network resources.")
                if tag_flags.get('has_powershell_or_dropper_strings'):
                    red_flags.append("CRITICAL: DROPPER STRINGS — PowerShell or dropper commands detected.")
                if tag_flags.get('has_decoded_ioc'):
                    red_flags.append("CRITICAL: INDICATORS OF COMPROMISE — decoded IOCs found in the file.")
                if tag_flags.get('has_dangerous_commands'):
                    red_flags.append("CRITICAL: DANGEROUS COMMANDS — shell/system execution commands detected.")
                if tag_flags.get('has_embedded_object'):
                    red_flags.append("WARNING: EMBEDDED OBJECT — file contains embedded OLE objects.")
                if tag_flags.get('has_long_base64_candidate'):
                    red_flags.append("WARNING: BASE64 PAYLOAD — long Base64-encoded strings detected (possible encoded payload).")
                if file_type.get('is_openxml_zip') and suffix in ole_extensions:
                    red_flags.append(f"CRITICAL (CONFIRMED): Office module confirms file is OpenXML ZIP but uses '{suffix}' extension. Deliberate extension disguise.")
            except Exception:
                pass

        extracted_contents = []

        pdf_like = is_pdf or (b"obj" in raw_bytes[:4096] and b"endobj" in raw_bytes[:4096])
        if pdf_like:
            object_regex = re.compile(r"(\d+\s+\d+\s+obj\b.*?endobj)", re.DOTALL)
            matches = object_regex.findall(decoded_content)
            count = 0
            for obj in matches:
                if count >= 5:
                    break
                obj_lower = obj.lower()
                if any(k in obj_lower for k in ["/js", "/javascript", "/openaction", "/aa", "/launch", "/submitform"]):
                    if len(obj) > 1500:
                        extracted_contents.append(obj[:800] + "\n\n... [TRUNCATED OBJECT CONTENT DUE TO SIZE] ...\n\n" + obj[-700:])
                    else:
                        extracted_contents.append(obj)
                    count += 1

        if html_like or suffix in {".svg", ".xml", ".html", ".htm"}:
            script_regex = re.compile(r"(<script.*?>.*?</script>)", re.DOTALL | re.IGNORECASE)
            scripts = script_regex.findall(decoded_content)
            for scr in scripts:
                if len(scr) > 3000:
                    extracted_contents.append(scr[:1500] + "\n\n... [TRUNCATED SCRIPT CONTENT] ...\n\n" + scr[-1000:])
                else:
                    extracted_contents.append(scr)

        macro_lines = []
        for s in raw_strings:
            s_lower = s.lower()
            if any(m in s_lower for m in [
                "autoopen", "document_open", "workbook_open", "shell", "powershell", 
                "wscript", "cscript", "createobject", "winmgmts", "http", "xmlhttp", 
                "downloadfile", "virtualalloc", "writeprocessmemory", "ddeauto", "base64"
            ]) or re.search(r"\bdde\b", s_lower):
                truncated_s = s if len(s) <= 400 else (s[:200] + " ... [TRUNCATED] ... " + s[-200:])
                macro_lines.append(truncated_s)
        if macro_lines:
            extracted_contents.append("--- SUSPICIOUS OFFICE MACRO OR CODING SNIPPETS ---\n" + "\n".join(list(dict.fromkeys(macro_lines))[:30]))

        truncated_forensic = [s if len(s) <= 400 else (s[:200] + " ... [TRUNCATED] ... " + s[-200:]) for s in forensic_list]
        forensic_data = {
            "urls": urls,
            "decoded_qr_links": decoded_qr_links,
            "extracted_object_contents": extracted_contents,
            "suspicious_metadata": list(dict.fromkeys(truncated_forensic))[:30]
        }

        word_preview = self._get_word_preview(file_path, raw_bytes, raw_strings)
        excel_fields = self._get_excel_top_fields(file_path, raw_bytes, raw_strings)

        preview_block = ""
        if word_preview:
            preview_block += f"\n\n=== OFFICE WORD PREVIEW ===\n{word_preview}"
        if excel_fields:
            preview_block += f"\n\n=== OFFICE EXCEL PREVIEW ===\n{json.dumps(excel_fields, indent=4)}"
        file_type_block = ""
        if image_like or svg_like:
            detected_type = "SVG" if svg_like else "image"
            file_type_block = f"\n\n=== FILE TYPE NOTES ===\nFile type detected as {detected_type}. Visual text is excluded from analysis for this file type."

        red_flag_block = ""
        if red_flags:
            red_flag_block = "\n\n=== ⚠️ HEURISTIC RED FLAGS (STRUCTURAL ANOMALIES) ===\n" + "\n".join(f"  • {rf}" for rf in red_flags)

        return f"=== VISUAL TEXT (READABLE) ===\n{visual_text}{preview_block}{file_type_block}{red_flag_block}\n\n=== FORENSIC DATA (HIDDEN STRINGS & URLs) ===\n{json.dumps(forensic_data, indent=4)}", links

    # ---------------------------------------------------------
    # TOOL 2: LLM TOOL (With Retry Logic)
    # ---------------------------------------------------------
    
    def call_llm_analyzer(self, formatted_context: str, retries=3) -> Dict[str, Any]:
        prompt = f"""
        System: You are an elite Cyber-Forensics AI.
        Task: Analyze the 'Visual', 'File Type', and 'Forensic' sections to detect malicious intent.
        
        GOLDEN RULES:
        1. BLANK DOCUMENTS: If VISUAL TEXT is [EMPTY/BLANK DOCUMENT], it is highly suspicious for non-image and non-SVG files. Do not apply this rule to image or SVG files; for those, base your decision on binary objects and extracted payload evidence alone.
        2. PDF STRUCTURE: Ignore normal PDF syntax tokens such as /Filter /FlateDecode, /Length, endstream, obj, and stream unless they appear inside an object containing active scripting or launch behavior.
        3. AUTO-EXECUTION: Treat /OpenAction as suspicious only when it is paired with active scripting (/JavaScript), a launch/URI action, or other executable behavior. Internal PDF navigation alone is not enough to classify a document as malicious.
        4. LOGIC GAPS: A file with no visible text but complex hidden streams is suspicious, especially when it also contains active script, external URLs, or execution triggers.
        
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
            formatted_context, links = self.run_extraction_pipeline(file_path)
            analysis = self.call_llm_analyzer(formatted_context)
            return {
                "filename": file_path.name,
                "status": "malicious" if analysis.get("is_malicious") else "benign",
                "links": links,
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
