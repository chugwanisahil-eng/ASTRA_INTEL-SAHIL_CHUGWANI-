/**
 * In-memory backend used when VITE_USE_MOCK=true.
 * Mirrors the FastAPI contract so the UI can be demoed without a server.
 * Defence / UAS-themed sample documents and answers live here.
 */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const STATUS = {
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  OCR: 'ocr_in_progress',
  READY: 'ready',
  FAILED: 'failed',
};

const DOC_UAS = 'doc-uas-01';
const DOC_C2 = 'doc-c2-02';

let documents = [
  {
    id: DOC_UAS,
    filename: 'UAS_Capability_Brief_2024.pdf',
    pages: 6,
    status: STATUS.READY,
    ocr_used: false,
    fileUrl: '/sample-uas.pdf',
  },
  {
    id: DOC_C2,
    filename: 'C2_Integration_Whitepaper.pdf',
    pages: 4,
    status: STATUS.READY,
    ocr_used: true,
    fileUrl: '/sample-c2.pdf',
  },
];

const fileBlobs = new Map();

function isoDaysAgo(days, hours = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, 12, 0, 0);
  return d.toISOString();
}

let conversations = [
  {
    id: 'conv-today-1',
    title: 'ISR coverage from Group 2-3 UAS',
    document_ids: [DOC_UAS],
    updated_at: isoDaysAgo(0, 16),
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'What ISR role do Group 2-3 UAS play?',
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          '**Group 2–3 UAS** provide **persistent ISR coverage** over contested littoral approaches without exposing aircrew to surface-to-air threats.\n\nThey sit in a mixed fleet with smaller tactical quadcopters for brigade and joint task force use. Attritable airframes are recommended to absorb expected combat loss rates.',
        supported: true,
        grounding: 'high',
        sources: [
          {
            document_id: DOC_UAS,
            document_name: 'UAS_Capability_Brief_2024.pdf',
            page: 1,
            snippet:
              'Group 2-3 UAS platforms provide persistent ISR coverage over contested littoral approaches without exposing aircrew to surface-to-air threats.',
            score: 0.94,
          },
          {
            document_id: DOC_UAS,
            document_name: 'UAS_Capability_Brief_2024.pdf',
            page: 1,
            snippet:
              'A mixed fleet of medium-altitude long-endurance air vehicles and smaller tactical quadcopters is recommended for brigade and joint task force use.',
            score: 0.81,
          },
        ],
      },
    ],
  },
  {
    id: 'conv-yesterday-1',
    title: 'Lost-link and C2 resilience',
    document_ids: [DOC_UAS, DOC_C2],
    updated_at: isoDaysAgo(1, 14),
    messages: [
      {
        id: 'm3',
        role: 'user',
        content: 'How should lost-link be handled?',
      },
      {
        id: 'm4',
        role: 'assistant',
        content:
          'Lost-link procedures must include a documented **return-to-home orbit** and an automatic **flight termination** option over water or designated ranges.\n\nC2 should keep **SATCOM as primary** with line-of-sight radio as fallback. STANAG 4586 is the interoperability baseline so allied payloads can be retasked.',
        supported: true,
        grounding: 'high',
        sources: [
          {
            document_id: DOC_UAS,
            document_name: 'UAS_Capability_Brief_2024.pdf',
            page: 2,
            snippet:
              'Lost-link procedures must include a documented return-to-home orbit and an automatic flight termination option over water or designated ranges.',
            score: 0.91,
          },
          {
            document_id: DOC_C2,
            document_name: 'C2_Integration_Whitepaper.pdf',
            page: 2,
            snippet:
              'STANAG 4586 remains the baseline control interface. National extensions must not break the core message set used for take-off, payload cueing and lost-link handling.',
            score: 0.77,
          },
        ],
      },
    ],
  },
  {
    id: 'conv-earlier-1',
    title: 'Payload mix for Indo-Pacific ISR',
    document_ids: [DOC_UAS],
    updated_at: isoDaysAgo(6, 9),
    messages: [],
  },
];

let idCounter = 100;

function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function publicDoc(doc) {
  const { fileUrl, ...rest } = doc;
  return clone(rest);
}

const SUMMARIES = {
  [DOC_UAS]: {
    summary:
      'A 2024 capability brief on unmanned aerial systems for ISR and limited strike. It argues for a mixed Group 2–3 and tactical fleet, redundant C2, SAR in addition to EO/IR, and a near-term focus on GNSS-degraded operations. Autonomous engagement is not authorised.',
    entities: [
      { text: 'MQ-9 Reaper', type: 'system' },
      { text: 'STANAG 4586', type: 'system' },
      { text: 'NATO', type: 'organisation' },
      { text: 'General Atomics', type: 'organisation' },
      { text: 'Indo-Pacific', type: 'location' },
      { text: '2024–2026', type: 'date' },
    ],
  },
  [DOC_C2]: {
    summary:
      'A joint C2 integration whitepaper that complements the UAS capability brief. It focuses on ground-segment interoperability, STANAG 4586, dual-path datalinks, and keeping a human in the loop for munition release.',
    entities: [
      { text: 'STANAG 4586', type: 'system' },
      { text: 'NATO CAOC', type: 'organisation' },
      { text: 'SATCOM', type: 'system' },
      { text: 'maritime operations centre', type: 'location' },
    ],
  },
};

const PASSAGES = [
  {
    document_id: DOC_UAS,
    document_name: 'UAS_Capability_Brief_2024.pdf',
    page: 1,
    snippet:
      'Group 2-3 UAS platforms provide persistent ISR coverage over contested littoral approaches without exposing aircrew to surface-to-air threats.',
    score: 0.94,
    tags: ['isr', 'group', 'coverage', 'summarize', 'highlight'],
  },
  {
    document_id: DOC_UAS,
    document_name: 'UAS_Capability_Brief_2024.pdf',
    page: 2,
    snippet:
      'Beyond visual line of sight operations require redundant C2 links, including SATCOM primary and line-of-sight radio as a fallback path.',
    score: 0.9,
    tags: ['c2', 'bvlos', 'satcom', 'link'],
  },
  {
    document_id: DOC_UAS,
    document_name: 'UAS_Capability_Brief_2024.pdf',
    page: 2,
    snippet:
      'Ground control stations should implement STANAG 4586 interoperability so allied payloads and air vehicles can be retasked during coalition ops.',
    score: 0.86,
    tags: ['stanag', 'nato', 'interoperability'],
  },
  {
    document_id: DOC_UAS,
    document_name: 'UAS_Capability_Brief_2024.pdf',
    page: 3,
    snippet:
      'Synthetic aperture radar is required for weather-independent mapping of coastal movement corridors in the Indo-Pacific theatre.',
    score: 0.84,
    tags: ['sar', 'sensor', 'indo-pacific', 'payload'],
  },
  {
    document_id: DOC_UAS,
    document_name: 'UAS_Capability_Brief_2024.pdf',
    page: 3,
    snippet:
      'Autonomous target engagement is not authorised.',
    score: 0.8,
    tags: ['risk', 'autonomous', 'strike'],
  },
  {
    document_id: DOC_UAS,
    document_name: 'UAS_Capability_Brief_2024.pdf',
    page: 4,
    snippet:
      'Ship-to-shore surveillance during amphibious entry operations.',
    score: 0.78,
    tags: ['application', 'amphibious', 'surveillance'],
  },
  {
    document_id: DOC_UAS,
    document_name: 'UAS_Capability_Brief_2024.pdf',
    page: 4,
    snippet:
      'UAS are vulnerable to cheap electronic warfare and GNSS spoofing.',
    score: 0.88,
    tags: ['risk', 'ew', 'gnss', 'limitation'],
  },
  {
    document_id: DOC_C2,
    document_name: 'C2_Integration_Whitepaper.pdf',
    page: 2,
    snippet:
      'STANAG 4586 remains the baseline control interface. National extensions must not break the core message set used for take-off, payload cueing and lost-link handling.',
    score: 0.87,
    tags: ['stanag', 'c2', 'lost-link'],
  },
  {
    document_id: DOC_C2,
    document_name: 'C2_Integration_Whitepaper.pdf',
    page: 3,
    snippet:
      'Similarities include the same requirement for redundant C2 links and the prohibition on autonomous target engagement without a human in the loop.',
    score: 0.82,
    tags: ['compare', 'c2', 'human'],
  },
  {
    document_id: DOC_C2,
    document_name: 'C2_Integration_Whitepaper.pdf',
    page: 3,
    snippet:
      'Capability briefs list sensors and air vehicle classes. This whitepaper instead lists C2 failure modes: SATCOM fade, control-station power loss, and cross-domain guard delays when tracks move to classified networks.',
    score: 0.8,
    tags: ['compare', 'difference', 'satcom'],
  },
];

function scoreQuery(query, passage) {
  const q = query.toLowerCase();
  let score = passage.score * 0.3;
  for (const tag of passage.tags) {
    if (q.includes(tag)) score += 0.15;
  }
  for (const word of q.split(/\s+/).filter((w) => w.length > 3)) {
    if (passage.snippet.toLowerCase().includes(word)) score += 0.08;
  }
  return Math.min(score, 0.99);
}

function buildAnswer(question, documentIds, mode) {
  const q = question.toLowerCase();
  const scoped = PASSAGES.filter((p) => documentIds.includes(p.document_id));
  const ranked = scoped
    .map((p) => ({ ...p, score: Number(scoreQuery(question, p).toFixed(2)) }))
    .sort((a, b) => b.score - a.score);

  const unsupported =
    q.includes('budget') ||
    q.includes('classified') ||
    q.includes('personnel name') ||
    ranked.length === 0;

  if (unsupported) {
    return {
      answer:
        'The selected document(s) do not contain enough information to answer this question with supporting passages.',
      supported: false,
      grounding: 'low',
      sources: [],
    };
  }

  if (mode === 'compare') {
    return {
      answer:
        'Compared the selected documents on command-and-control, payloads, and authorisation policy.',
      supported: true,
      grounding: 'medium',
      sources: ranked.slice(0, 4),
      compare: {
        similarities:
          'Both documents require **redundant C2 links** (SATCOM plus a fallback) and forbid **autonomous target engagement** without a human in the loop. STANAG 4586 appears as the coalition control baseline.',
        differences:
          'The capability brief catalogues **air vehicle classes, sensors (EO/IR, SAR) and mission types**. The C2 whitepaper instead stresses **ground-segment failure modes** (SATCOM fade, control-station power loss, cross-domain delay) and multi-vehicle tasking from a NATO CAOC.',
      },
    };
  }

  if (q.includes('summarize') || q.includes('summary')) {
    return {
      answer:
        'The brief recommends a **mixed UAS fleet** for persistent ISR, with **redundant datalinks**, **SAR plus EO/IR**, and training for **GNSS-degraded** environments. Strike remains human-authorised only. Near-term spend should favour C2 resilience over extra airframes.',
      supported: true,
      grounding: 'high',
      sources: ranked.slice(0, 3),
    };
  }

  if (q.includes('highlight')) {
    return {
      answer:
        '- Persistent ISR from Group 2–3 UAS over contested littorals\n- BVLOS needs SATCOM plus LOS radio fallback\n- STANAG 4586 for coalition retasking\n- SAR required for Indo-Pacific weather-independent mapping\n- No autonomous engagement',
      supported: true,
      grounding: 'high',
      sources: ranked.slice(0, 4),
    };
  }

  if (q.includes('entit')) {
    return {
      answer:
        'Key entities in the selected material include **MQ-9 Reaper**, **STANAG 4586**, **NATO**, **General Atomics**, the **Indo-Pacific** theatre, and the **2024–2026** capability refresh window.',
      supported: true,
      grounding: 'medium',
      sources: ranked.slice(0, 3),
    };
  }

  if (q.includes('application')) {
    return {
      answer:
        'Documented applications: EEZ and border monitoring, convoy overwatch, **ship-to-shore surveillance** during amphibious entry, and battle damage assessment after stand-off fires.',
      supported: true,
      grounding: 'high',
      sources: ranked.slice(0, 3),
    };
  }

  if (q.includes('risk') || q.includes('limitation')) {
    return {
      answer:
        'Principal risks: cheap **electronic warfare** and **GNSS spoofing**, contested-spectrum limits on full-motion video, civil airspace constraints on training, and weather/icing reducing small-UAS endurance.',
      supported: true,
      grounding: 'high',
      sources: ranked.slice(0, 3),
    };
  }

  const top = ranked[0];
  return {
    answer: `Based on the selected document(s):\n\n${top.snippet}\n\nRelated passages are listed in Sources. Grounding is derived from retrieval overlap with the question.`,
    supported: true,
    grounding: ranked[0].score > 0.85 ? 'high' : ranked[0].score > 0.6 ? 'medium' : 'low',
    sources: ranked.slice(0, 3),
  };
}

async function ensureSeedBlobs() {
  for (const doc of documents) {
    if (doc.fileUrl && !fileBlobs.has(doc.id)) {
      const res = await fetch(doc.fileUrl);
      const blob = await res.blob();
      fileBlobs.set(doc.id, blob);
    }
  }
}

export const mockApi = {
  async health() {
    await wait(200);
    return { status: 'ok' };
  },

  async listDocuments() {
    await wait(180);
    return documents.map(publicDoc);
  },

  async uploadDocument(file) {
    await wait(250);
    if (!file) {
      const err = { code: 'NO_DOCUMENT', message: 'No file provided.' };
      throw err;
    }
    if (file.size === 0) {
      throw { code: 'EMPTY_PDF', message: 'The PDF is empty.' };
    }
    if (file.size > 25 * 1024 * 1024) {
      throw { code: 'FILE_TOO_LARGE', message: 'File exceeds 25 MB.' };
    }
    const name = file.name || 'document.pdf';
    if (!name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      throw { code: 'UNSUPPORTED_TYPE', message: 'Only PDF files are accepted.' };
    }

    const header = await file.slice(0, 5).text();
    if (header && !header.startsWith('%PDF') && file.size < 500) {
      throw { code: 'CORRUPT_PDF', message: 'Could not parse this PDF.' };
    }

    const id = nextId('doc');
    const doc = {
      id,
      filename: name,
      pages: 0,
      status: STATUS.UPLOADING,
      ocr_used: false,
    };
    documents = [doc, ...documents];
    fileBlobs.set(id, file);

    // Simulate processing so status badges can be demoed.
    setTimeout(() => {
      const current = documents.find((d) => d.id === id);
      if (current) current.status = STATUS.PROCESSING;
    }, 700);
    setTimeout(() => {
      const current = documents.find((d) => d.id === id);
      if (current) {
        current.status = STATUS.OCR;
        current.ocr_used = true;
      }
    }, 1400);
    setTimeout(() => {
      const current = documents.find((d) => d.id === id);
      if (current) {
        current.status = STATUS.READY;
        current.pages = Math.max(1, Math.round(file.size / 12000) || 1);
      }
    }, 2400);

    return publicDoc(doc);
  },

  async getDocumentFile(id) {
    await wait(120);
    await ensureSeedBlobs();
    const blob = fileBlobs.get(id);
    if (!blob) {
      throw { code: 'NO_DOCUMENT', message: 'Document file not found.' };
    }
    return blob;
  },

  async getSummary(id) {
    await wait(650);
    if (SUMMARIES[id]) return clone(SUMMARIES[id]);
    const doc = documents.find((d) => d.id === id);
    if (!doc || doc.status !== STATUS.READY) {
      throw { code: 'NO_DOCUMENT', message: 'Summary is not available yet.' };
    }
    return {
      summary: `Indexed “${doc.filename}”. A full narrative summary will come from the backend once LlamaIndex is wired up. Mock mode returns this placeholder for newly uploaded files.`,
      entities: [
        { text: doc.filename.replace('.pdf', ''), type: 'system' },
      ],
    };
  },

  async deleteDocument(id) {
    await wait(180);
    documents = documents.filter((d) => d.id !== id);
    fileBlobs.delete(id);
    conversations = conversations.map((c) => ({
      ...c,
      document_ids: c.document_ids.filter((did) => did !== id),
    }));
    return { ok: true };
  },

  async listConversations() {
    await wait(160);
    return conversations.map(({ messages, ...rest }) => clone(rest));
  },

  async createConversation(payload = {}) {
    await wait(160);
    const conv = {
      id: nextId('conv'),
      title: payload.title || 'New chat',
      document_ids: payload.document_ids || [],
      updated_at: new Date().toISOString(),
      messages: [],
    };
    conversations = [conv, ...conversations];
    return { id: conv.id };
  },

  async getConversation(id) {
    await wait(180);
    const conv = conversations.find((c) => c.id === id);
    if (!conv) throw { code: 'NOT_FOUND', message: 'Conversation not found.' };
    return clone(conv);
  },

  async renameConversation(id, title) {
    await wait(120);
    const conv = conversations.find((c) => c.id === id);
    if (!conv) throw { code: 'NOT_FOUND', message: 'Conversation not found.' };
    conv.title = title;
    conv.updated_at = new Date().toISOString();
    const { messages, ...rest } = conv;
    return clone(rest);
  },

  async deleteConversation(id) {
    await wait(140);
    conversations = conversations.filter((c) => c.id !== id);
    return { ok: true };
  },

  async sendMessage(id, body) {
    if (String(body?.question || '').toLowerCase().includes('timeout')) {
      await wait(400);
      throw { code: 'TIMEOUT', message: 'The model request timed out.' };
    }
    await wait(900);
    const conv = conversations.find((c) => c.id === id);
    if (!conv) throw { code: 'NOT_FOUND', message: 'Conversation not found.' };

    const documentIds = body.document_ids?.length ? body.document_ids : conv.document_ids;
    const mode = body.mode || 'single';
    const result = buildAnswer(body.question, documentIds, mode);

    const userMsg = { id: nextId('msg'), role: 'user', content: body.question };
    const assistantMsg = {
      id: nextId('msg'),
      role: 'assistant',
      content: result.answer,
      supported: result.supported,
      grounding: result.grounding,
      sources: result.sources,
      mode,
      compare: result.compare,
    };
    conv.messages.push(userMsg, assistantMsg);
    conv.document_ids = [...new Set([...conv.document_ids, ...documentIds])];
    if (conv.title === 'New chat') {
      conv.title = body.question.slice(0, 72);
    }
    conv.updated_at = new Date().toISOString();
    return clone({
      answer: result.answer,
      supported: result.supported,
      grounding: result.grounding,
      sources: result.sources,
      compare: result.compare,
      user_message: userMsg,
      assistant_message: assistantMsg,
    });
  },

  async search({ query, document_ids }) {
    await wait(400);
    const ids = document_ids?.length ? document_ids : documents.map((d) => d.id);
    return PASSAGES.filter((p) => ids.includes(p.document_id))
      .map((p) => ({
        document_id: p.document_id,
        document_name: p.document_name,
        page: p.page,
        snippet: p.snippet,
        score: Number(scoreQuery(query, p).toFixed(2)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  },
};
