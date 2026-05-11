import re
import sys
import json
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("[!] Warning: PyMuPDF not found. Visual text extraction will be skipped.")
    print("[!] Install it using: pip install pymupdf")
    fitz = None

# Regex patterns for forensic string extraction
ASCII_STRING_REGEX = re.compile(rb"[\x20-\x7e]{4,}")
URL_REGEX = re.compile(r"https?://[^\s<>()\"'\\]+", re.IGNORECASE)

def extract_visual_text(pdf_path):
    """Extracts the actual readable text from the PDF pages."""
    if not fitz:
        return "PyMuPDF not installed."
    
    text_content = ""
    try:
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text_content += f"--- Page {page_num + 1} ---\n"
            text_content += page.get_text()
        doc.close()
        return text_content
    except Exception as e:
        return f"Error extracting visual text: {e}"

def extract_forensic_strings(pdf_path):
    """Extracts hidden strings, metadata, and URLs from the binary structure."""
    try:
        data = Path(pdf_path).read_bytes()
        
        # 1. Extract all ASCII strings (hidden code, metadata, etc.)
        all_strings = [m.decode("latin-1", errors="ignore") for m in ASCII_STRING_REGEX.findall(data)]
        
        # 2. Filter for interesting keywords often found in phishing/malware
        keywords = ["javascript", "js", "openaction", "launch", "aa", "embedded", "obj", "stream"]
        evidence = [s for s in all_strings if any(k in s.lower() for k in keywords)]
        
        # 3. Extract URLs
        content = data.decode("latin-1", errors="ignore")
        urls = list(set(URL_REGEX.findall(content)))
        
        return {
            "urls": urls,
            "suspicious_metadata": list(set(evidence))[:50] # Top 50 unique strings
        }
    except Exception as e:
        return f"Error extracting forensic strings: {e}"

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_pdf_strings.py <path_to_pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not Path(pdf_path).exists():
        print(f"File not found: {pdf_path}")
        sys.exit(1)

    print(f"[*] Analyzing: {pdf_path}\n")

    # Perform Extractions
    visual_text = extract_visual_text(pdf_path)
    forensic_data = extract_forensic_strings(pdf_path)

    # Output Results
    print("=== VISUAL TEXT (READABLE) ===")
    print(visual_text[:1000] + ("..." if len(visual_text) > 1000 else ""))
    
    print("\n=== FORENSIC DATA (HIDDEN STRINGS & URLs) ===")
    print(json.dumps(forensic_data, indent=4))

if __name__ == "__main__":
    main()
