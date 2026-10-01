import os
import json
import re

from openai import OpenAI


# =========================================================
# OPENROUTER CONFIGURATION
# =========================================================

API_KEY = os.getenv("OPENROUTER_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "OPENROUTER_API_KEY is missing from the environment."
    )


client = OpenAI(
    api_key=API_KEY,
    base_url="https://openrouter.ai/api/v1"
)


# =========================================================
# GENERATE ANSWER
# =========================================================

def generate_answer(question, retrieved_chunks):

    if not retrieved_chunks:
        return {
            "answer": "I couldn't find this information in the provided document.",
            "citations": []
        }

    context_parts = []

    for chunk in retrieved_chunks:

        context_parts.append(
            f"""
[Page {chunk['page']}]

{chunk['text']}
"""
        )

    context = "\n".join(context_parts)

    prompt = f"""
You are Astra Intel, a document-grounded AI assistant.

Your job is to answer the user's question using ONLY the information
contained in the provided document context.

========================
STRICT GROUNDING RULES
========================

1. Use ONLY the provided document context to answer.

2. DO NOT use outside knowledge, assumptions, memory, or guesses.

3. If the answer is explicitly stated in the context, answer it directly.

4. If the answer requires combining information from multiple retrieved
sections, you may combine those sections, but do not add information
that is not supported by them.

5. If the document does not contain enough information to answer the
question, clearly say:

"I couldn't find this information in the provided document."

6. Never invent names, dates, numbers, facts, explanations, or conclusions.

7. Do not claim that something is in the document unless it is actually
supported by the provided context.

========================
QUESTION INTERPRETATION
========================

Interpret the user's question carefully.

For questions asking for a specific field, name, value, date, number,
person, location, title, or definition:

- Look for exact wording in the context first.
- Pay special attention to labels such as:
  "Name:", "Guide:", "Author:", "Date:", "Title:", etc.
- Do not replace an explicitly stated value with an inferred value.

Example:

Context:
"Name of the Guide: PROF. VIVEKANAND UPADHYE"

Question:
"What is the name of the guide?"

Answer:
"The guide is Prof. Vivekanand Upadhye."

For questions asking "who", "what", "when", "where", or "which",
provide the specific answer first.

========================
ANSWERING STYLE
========================

Be concise and precise.

For a simple factual question:
- Give the answer in 1–3 sentences.

For an explanatory question:
- Give a short explanation.
- Use bullet points when multiple points are required.

For a comparison:
- Clearly describe each item using only information from the document.

For a "why" or "how" question:
- Explain the reasoning only when the document provides enough information.

Do not start every answer with phrases such as:
"According to the document..."
"The document states..."
unless useful for clarity.

Do not repeat the question.

Do not add unnecessary conclusions or recommendations.

========================
CITATIONS
========================

Use the page numbers provided in the context.

When making a factual claim supported by a specific page, cite it as:

[Page X]

If multiple pages support different parts of the answer, cite the
relevant page after each part.

Do not invent page numbers.

Only cite pages that are present in the provided context.

========================
CONTEXT
========================

{context}

========================
USER QUESTION
========================

{question}

========================
FINAL INSTRUCTION
========================

First determine whether the provided context actually contains enough
information to answer the question.

If YES:
- Answer directly.
- Use only supported information.
- Include relevant page citations.

If NO:
- Do not guess.
- Respond exactly with:

"I couldn't find this information in the provided document."

Return only the final answer.
"""

    try:

        response = client.chat.completions.create(
            model="openrouter/free",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        answer = (
            response.choices[0]
            .message.content
            .strip()
        )

    except Exception as e:

        print(
            "ANSWER GENERATION ERROR:",
            e
        )

        return {
            "answer": "Unable to generate an answer at this time.",
            "citations": []
        }

    citations = []

    seen_pages = set()

    for chunk in retrieved_chunks:

        page = chunk["page"]

        if page not in seen_pages:

            citations.append({
                "page": page,
                "excerpt": chunk["text"][:300]
            })

            seen_pages.add(page)

    return {
        "answer": answer,
        "citations": citations
    }


# =========================================================
# GENERATE SUMMARY
# =========================================================

def generate_summary(document_chunks):

    if not document_chunks:

        return {
            "summary": "I couldn't find any content in the provided document.",
            "key_points": [],
            "entities": [],
            "citations": []
        }

    context_parts = []

    for chunk in document_chunks:

        context_parts.append(
            f"""
[Page {chunk['page']}]

{chunk['text']}
"""
        )

    context = "\n".join(context_parts)

    prompt = f"""
You are Astra Intel, a document intelligence and summarization system.

Analyze the provided document and return a structured summary.

STRICT GROUNDING RULES:

1. Use ONLY information contained in the provided document.

2. Do NOT use outside knowledge.

3. Do NOT invent facts, names, dates, technologies, organizations,
   conclusions, or relationships.

4. If something is not clearly present in the document, do not include it.

5. Do not make assumptions.

6. Preserve the meaning of the document.

7. The summary should represent the document as a whole.

Return ONLY valid JSON.

Use exactly this structure:

{{
    "summary": "A concise overview of the entire document.",

    "key_points": [
        "Important point from the document",
        "Another important point from the document",
        "Another important point from the document"
    ],

    "entities": [
        {{
            "type": "technology",
            "text": "Entity name"
        }},
        {{
            "type": "organization",
            "text": "Organization name"
        }}
    ]
}}

ENTITY TYPES MAY INCLUDE:

- person
- organization
- technology
- place
- date
- concept
- system
- product
- other

ENTITY RULES:

- Only include entities explicitly present in the document.
- Do not infer entities.
- Avoid excessive entities.
- Include the most important entities only.

KEY POINT RULES:

- Provide approximately 4 to 7 important points.
- Each point should be concise.
- Cover important objectives, methods, findings, applications,
  systems, or conclusions when they are present.
- Do not repeat the summary.

SUMMARY RULES:

- Keep the overview concise.
- Explain what the document is mainly about.
- Include the purpose, major topics, methodology,
  applications, or conclusions when present.
- Do not add information that is not supported by the document.

DOCUMENT:

{context}

Return ONLY the JSON object.
"""

    try:

        response = client.chat.completions.create(
            model="openrouter/free",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        raw_response = (
            response.choices[0]
            .message.content
            .strip()
        )

        # Remove markdown code fences
        raw_response = re.sub(
            r"^```(?:json)?\s*",
            "",
            raw_response,
            flags=re.IGNORECASE
        )

        raw_response = re.sub(
            r"\s*```$",
            "",
            raw_response
        ).strip()

        # Extract JSON if model added extra text
        if not raw_response.startswith("{"):

            start = raw_response.find("{")
            end = raw_response.rfind("}")

            if start != -1 and end != -1:

                raw_response = raw_response[
                    start:end + 1
                ]

        result = json.loads(
            raw_response
        )

        summary = result.get(
            "summary",
            ""
        )

        if not isinstance(summary, str):
            summary = ""

        summary = summary.strip()

        key_points = result.get(
            "key_points",
            []
        )

        if not isinstance(key_points, list):
            key_points = []

        entities = result.get(
            "entities",
            []
        )

        if not isinstance(entities, list):
            entities = []

        # -------------------------------------------------
        # Clean entities
        # -------------------------------------------------

        cleaned_entities = []

        for entity in entities:

            if not isinstance(entity, dict):
                continue

            entity_type = str(
                entity.get(
                    "type",
                    "other"
                )
            ).strip()

            entity_text = str(
                entity.get(
                    "text",
                    ""
                )
            ).strip()

            if entity_text:

                cleaned_entities.append({
                    "type": entity_type,
                    "text": entity_text
                })

        # -------------------------------------------------
        # Generate citations
        # -------------------------------------------------

        citations = []

        seen_pages = set()

        for chunk in document_chunks:

            page = chunk["page"]

            if page not in seen_pages:

                citations.append({
                    "page": page,
                    "excerpt": chunk["text"][:300]
                })

                seen_pages.add(page)

        return {
            "summary": summary,
            "key_points": key_points,
            "entities": cleaned_entities,
            "citations": citations
        }

    except Exception as e:

        print(
            "SUMMARY GENERATION ERROR:",
            e
        )

        return {
            "summary": "Unable to generate the document summary.",
            "key_points": [],
            "entities": [],
            "citations": []
        }


# =========================================================
# GENERATE COMPARISON
# =========================================================

def generate_comparison(
    document_a_chunks,
    document_b_chunks,
    document_a_name,
    document_b_name
):

    # -----------------------------------------------------
    # Check document content
    # -----------------------------------------------------

    if not document_a_chunks or not document_b_chunks:

        return {
            "similarities": [],
            "differences": [],
            "new_information": [],
            "removed_information": [],
            "citations": []
        }

    # -----------------------------------------------------
    # Build Document A context
    # -----------------------------------------------------

    document_a_parts = []

    for chunk in document_a_chunks:

        document_a_parts.append(
            f"""
[Document A - Page {chunk['page']}]

{chunk['text']}
"""
        )

    document_a_context = "\n".join(
        document_a_parts
    )

    # -----------------------------------------------------
    # Build Document B context
    # -----------------------------------------------------

    document_b_parts = []

    for chunk in document_b_chunks:

        document_b_parts.append(
            f"""
[Document B - Page {chunk['page']}]

{chunk['text']}
"""
        )

    document_b_context = "\n".join(
        document_b_parts
    )

    # -----------------------------------------------------
    # Prevent excessively large requests
    # -----------------------------------------------------

    max_context_length = 50000

    document_a_context = document_a_context[
        :max_context_length
    ]

    document_b_context = document_b_context[
        :max_context_length
    ]

    # -----------------------------------------------------
    # Comparison prompt
    # -----------------------------------------------------

    prompt = f"""
You are Astra Intel, a document comparison AI.

Compare the two provided documents using ONLY their
provided content.

DOCUMENT A:
{document_a_name}

DOCUMENT B:
{document_b_name}

========================
STRICT GROUNDING RULES
========================

1. Use ONLY information contained in the two documents.

2. Do NOT use outside knowledge.

3. Do NOT invent facts, dates, numbers, names,
   conclusions, or relationships.

4. Do not assume that something exists in one document
   unless it is explicitly supported by its content.

5. If a category has no meaningful information,
   return an empty array.

6. Preserve the meaning of both documents.

7. Clearly distinguish Document A from Document B.

========================
COMPARISON TASK
========================

Identify:

1. SIMILARITIES

Information, concepts, objectives, methods,
systems, or conclusions that both documents share.

2. DIFFERENCES

Important differences between the documents.

3. NEW INFORMATION

Information present in Document B that is not
present in Document A.

Treat Document B as the newer/second document
for this comparison.

4. REMOVED INFORMATION

Information present in Document A that is not
present in Document B.

========================
OUTPUT FORMAT
========================

Return ONLY valid JSON.

Do not write any explanation before or after the JSON.

Do not use Markdown.

Use exactly this structure:

{{
    "similarities": [
        "Similarity 1",
        "Similarity 2"
    ],

    "differences": [
        "Difference 1",
        "Difference 2"
    ],

    "new_information": [
        "New information found in Document B"
    ],

    "removed_information": [
        "Information present in Document A but not Document B"
    ]
}}

========================
DOCUMENT A
========================

{document_a_context}

========================
DOCUMENT B
========================

{document_b_context}

Return ONLY the JSON object.
"""

    try:

        # -------------------------------------------------
        # Call OpenRouter
        # -------------------------------------------------

        response = client.chat.completions.create(
            model="openrouter/free",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        # -------------------------------------------------
        # Get raw response
        # -------------------------------------------------

        raw_response = (
            response.choices[0]
            .message.content
            .strip()
        )

        print(
            "\n================ COMPARISON RAW RESPONSE ================"
        )

        print(raw_response)

        print(
            "===========================================================\n"
        )

        # -------------------------------------------------
        # Empty response check
        # -------------------------------------------------

        if not raw_response:

            raise ValueError(
                "OpenRouter returned an empty comparison response."
            )

        # -------------------------------------------------
        # Remove Markdown code fences
        # -------------------------------------------------

        raw_response = re.sub(
            r"^```(?:json)?\s*",
            "",
            raw_response,
            flags=re.IGNORECASE
        )

        raw_response = re.sub(
            r"\s*```$",
            "",
            raw_response
        ).strip()

        # -------------------------------------------------
        # Extract JSON object
        #
        # This handles responses such as:
        #
        # Here is the comparison:
        # {
        #    ...
        # }
        # -------------------------------------------------

        if not raw_response.startswith("{"):

            start = raw_response.find("{")
            end = raw_response.rfind("}")

            if start != -1 and end != -1:

                raw_response = raw_response[
                    start:end + 1
                ]

        # -------------------------------------------------
        # Parse JSON
        # -------------------------------------------------

        try:

            result = json.loads(
                raw_response
            )

        except json.JSONDecodeError as json_error:

            print(
                "COMPARISON JSON PARSE ERROR:",
                json_error
            )

            print(
                "INVALID COMPARISON RESPONSE:"
            )

            print(
                raw_response
            )

            raise

        # -------------------------------------------------
        # Extract comparison sections
        # -------------------------------------------------

        similarities = result.get(
            "similarities",
            []
        )

        differences = result.get(
            "differences",
            []
        )

        new_information = result.get(
            "new_information",
            []
        )

        removed_information = result.get(
            "removed_information",
            []
        )

        # -------------------------------------------------
        # Make sure every field is a list
        # -------------------------------------------------

        if not isinstance(
            similarities,
            list
        ):

            similarities = []

        if not isinstance(
            differences,
            list
        ):

            differences = []

        if not isinstance(
            new_information,
            list
        ):

            new_information = []

        if not isinstance(
            removed_information,
            list
        ):

            removed_information = []

        # -------------------------------------------------
        # Clean list values
        # -------------------------------------------------

        similarities = [
            str(item).strip()
            for item in similarities
            if str(item).strip()
        ]

        differences = [
            str(item).strip()
            for item in differences
            if str(item).strip()
        ]

        new_information = [
            str(item).strip()
            for item in new_information
            if str(item).strip()
        ]

        removed_information = [
            str(item).strip()
            for item in removed_information
            if str(item).strip()
        ]

        # -------------------------------------------------
        # Generate citations from actual chunks
        # -------------------------------------------------

        citations = []

        seen = set()

        # -------------------------------------------------
        # Document A citations
        # -------------------------------------------------

        for chunk in document_a_chunks:

            key = (
                "a",
                chunk["page"]
            )

            if key not in seen:

                citations.append({
                    "document_id": None,
                    "document_name": document_a_name,
                    "document_side": "A",
                    "page": chunk["page"],
                    "excerpt": chunk["text"][:300]
                })

                seen.add(key)

        # -------------------------------------------------
        # Document B citations
        # -------------------------------------------------

        for chunk in document_b_chunks:

            key = (
                "b",
                chunk["page"]
            )

            if key not in seen:

                citations.append({
                    "document_id": None,
                    "document_name": document_b_name,
                    "document_side": "B",
                    "page": chunk["page"],
                    "excerpt": chunk["text"][:300]
                })

                seen.add(key)

        # -------------------------------------------------
        # Return comparison
        # -------------------------------------------------

        return {
            "similarities": similarities,
            "differences": differences,
            "new_information": new_information,
            "removed_information": removed_information,
            "citations": citations
        }

    except Exception as e:

        print(
            "COMPARISON GENERATION ERROR:",
            e
        )

        return {
            "similarities": [],
            "differences": [],
            "new_information": [],
            "removed_information": [],
            "citations": []
        }