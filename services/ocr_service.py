import pytesseract
from PIL import Image

# Tesseract installation path on Windows
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def extract_text_from_image(image):
    try:
        text = pytesseract.image_to_string(image)
        return text.strip()

    except Exception as e:
        print("OCR ERROR:", e)
        return ""