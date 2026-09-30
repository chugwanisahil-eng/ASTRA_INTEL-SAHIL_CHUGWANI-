import fitz
import io

from PIL import Image
from services.ocr_service import extract_text_from_image


def extract_pdf_pages(file_path):

    document = fitz.open(file_path)

    pages = []

    for page_number, page in enumerate(document, start=1):

        # First try normal PDF text extraction
        text = page.get_text("text").strip()

        if len(text) < 30:

            print(
                f"PAGE {page_number}: "
                f"Little/no text found. Running OCR..."
            )

            # Render PDF page as an image
            pix = page.get_pixmap(
                matrix=fitz.Matrix(2, 2),
                alpha=False
            )

            image_bytes = pix.tobytes("png")

            image = Image.open(
                io.BytesIO(image_bytes)
            )

            # OCR
            ocr_text = extract_text_from_image(image)

            if ocr_text:
                text = ocr_text

                print(
                    f"PAGE {page_number}: "
                    f"OCR extracted {len(text)} characters"
                )
            else:
                print(
                    f"PAGE {page_number}: "
                    f"OCR found no text"
                )

        else:

            print(
                f"PAGE {page_number}: "
                f"Normal extraction found {len(text)} characters"
            )

        pages.append({
    "page": page_number,
    "text": text
})

    document.close()

    return pages