/**
 * Single network boundary for the app.
 * Swap VITE_USE_MOCK=false and point VITE_API_URL at FastAPI when the backend is ready.
 * All methods throw { code, message } on failure so the UI can map friendly copy.
 */

import { mockApi } from './mock.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const ERROR_COPY = {
  MISSING_API_KEY: 'The backend is missing a Gemini API key. Chat will stay unavailable until it is configured.',
  EMPTY_PDF: 'This PDF has no pages we can read. Try another file.',
  CORRUPT_PDF: "Couldn't read this file. It may be damaged or not a real PDF.",
  FILE_TOO_LARGE: 'That file is over 25 MB. Please upload a smaller PDF.',
  NO_DOCUMENT: 'Upload a document before asking a question.',
  TIMEOUT: 'The request timed out. You can retry the same question.',
  UNSUPPORTED_TYPE: 'Only PDF files are accepted.',
  NETWORK: 'Cannot reach the backend. Check that the API is running.',
  NOT_FOUND: 'That item is no longer available.',
};

export function friendlyError(err) {
  const code = err?.code || 'NETWORK';
  return {
    code,
    message: ERROR_COPY[code] || err?.message || 'Something went wrong.',
  };
}

async function parseError(response) {
  try {
    const data = await response.json();
    return {
      code: data.code || data.error_code || `HTTP_${response.status}`,
      message: data.message || data.detail || response.statusText,
    };
  } catch {
    return {
      code: response.status === 0 ? 'NETWORK' : `HTTP_${response.status}`,
      message: response.statusText || 'Request failed.',
    };
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw { code: 'NETWORK', message: ERROR_COPY.NETWORK };
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  const type = response.headers.get('content-type') || '';
  if (options.expectBlob) return response.blob();
  if (response.status === 204) return null;
  if (type.includes('application/json')) return response.json();
  return response.text();
}

export const api = {
  useMock: USE_MOCK,
  baseUrl: BASE_URL,

  health() {
    if (USE_MOCK) return mockApi.health();
    return request('/health');
  },

  listDocuments() {
    if (USE_MOCK) return mockApi.listDocuments();
    return request('/documents');
  },

  uploadDocument(file) {
  if (USE_MOCK) return mockApi.uploadDocument(file);

  const body = new FormData();
  body.append('file', file);

  return request('/documents/upload', {
    method: 'POST',
    body,
  });
},

  getDocumentFile(id) {
    if (USE_MOCK) return mockApi.getDocumentFile(id);
    return request(`/documents/${id}/file`, { expectBlob: true });
  },

  getSummary(id) {
    if (USE_MOCK) return mockApi.getSummary(id);
    return request(`/documents/${id}/summary`);
  },

  regenerateSummary(id) {
  if (USE_MOCK) return mockApi.getSummary(id);

  return request(
    `/documents/${id}/summary/regenerate`,
    {
      method: 'POST'
    }
  );
},

  deleteDocument(id) {
    if (USE_MOCK) return mockApi.deleteDocument(id);
    return request(`/documents/${id}`, { method: 'DELETE' });
  },

  listConversations() {
    if (USE_MOCK) return mockApi.listConversations();
    return request('/conversations');
  },

  createConversation(payload) {
    if (USE_MOCK) return mockApi.createConversation(payload);
    return request('/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
  },

  getConversation(id) {
    if (USE_MOCK) return mockApi.getConversation(id);
    return request(`/conversations/${id}`);
  },

  renameConversation(id, title) {
    if (USE_MOCK) return mockApi.renameConversation(id, title);
    return request(`/conversations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
  },

  deleteConversation(id) {
    if (USE_MOCK) return mockApi.deleteConversation(id);
    return request(`/conversations/${id}`, { method: 'DELETE' });
  },

  sendMessage(conversationId, payload) {
  if (USE_MOCK) {
    return mockApi.sendMessage(conversationId, payload);
  }

  return request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question: payload.question,
      document_ids: payload.document_ids || [],
    }),
  });
},

  search(payload) {
    if (USE_MOCK) return mockApi.search(payload);
    return request('/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};
