/**
 * App-wide state: documents, conversations, theme, viewer controls.
 * Components never call fetch themselves — they go through `api` via these actions.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, friendlyError } from '../api/client.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState('viewer');
  const [chatWidth, setChatWidth] = useState(420);

  const [documents, setDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfError, setPdfError] = useState(null);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  const [healthOk, setHealthOk] = useState(false);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [citeTarget, setCiteTarget] = useState(null);
  const didBootChat = useRef(false);

  const viewerApiRef = useRef({
    scrollToPage: () => {},
  });

  const handleApiError = useCallback((err, { bannerCodes = ['MISSING_API_KEY', 'NETWORK'] } = {}) => {
    const mapped = friendlyError(err);
    if (bannerCodes.includes(mapped.code)) {
      setBanner(mapped);
    }
    if (mapped.code === 'NETWORK') setHealthOk(false);
    return mapped;
  }, []);

  const refreshDocuments = useCallback(async () => {
    try {
      const list = await api.listDocuments();
      setDocuments(list);
      setActiveDocumentId((current) => {
        if (current && list.some((d) => d.id === current)) return current;
        return list[0]?.id ?? null;
      });
      setSelectedIds((current) => {
        const valid = current.filter((id) => list.some((d) => d.id === id));
        if (valid.length) return valid;
        return list[0] ? [list[0].id] : [];
      });
    } catch (err) {
      handleApiError(err);
    }
  }, [handleApiError]);

  const refreshConversations = useCallback(async () => {
    try {
      const list = await api.listConversations();
      setConversations(list);
      if (!didBootChat.current && list[0]) {
        didBootChat.current = true;
        const full = await api.getConversation(list[0].id);
        setActiveConversation(full);
      }
    } catch (err) {
      handleApiError(err);
    }
  }, [handleApiError]);

  const pingHealth = useCallback(async () => {
    try {
      const res = await api.health();
      const ok = res?.status === 'ok';
      setHealthOk(ok);
      if (ok && banner?.code === 'NETWORK') setBanner(null);
    } catch (err) {
      setHealthOk(false);
      handleApiError(err);
    }
  }, [banner?.code, handleApiError]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    refreshDocuments();
    refreshConversations();
    pingHealth();
    const timer = setInterval(pingHealth, 15000);
    return () => clearInterval(timer);
  }, [refreshDocuments, refreshConversations, pingHealth]);

  // Poll documents that are still ingesting so status badges update.
  useEffect(() => {
    const pending = documents.some((d) => d.status && d.status !== 'ready' && d.status !== 'failed');
    if (!pending) return undefined;
    const timer = setInterval(refreshDocuments, 900);
    return () => clearInterval(timer);
  }, [documents, refreshDocuments]);

  useEffect(() => {
    let revoked = null;
    async function loadFile() {
      setPdfError(null);
      if (!activeDocumentId) {
        setPdfUrl(null);
        return;
      }
      const meta = documents.find((d) => d.id === activeDocumentId);
      if (!meta || (meta.status !== 'ready' && meta.status !== 'failed')) {
        setPdfUrl(null);
        return;
      }
      try {
        const blob = await api.getDocumentFile(activeDocumentId);
        const url = URL.createObjectURL(blob);
        revoked = url;
        setPdfUrl(url);
      } catch (err) {
        const mapped = handleApiError(err, { bannerCodes: ['MISSING_API_KEY', 'NETWORK'] });
        setPdfError(mapped);
        setPdfUrl(null);
      }
    }
    loadFile();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [activeDocumentId, documents, handleApiError]);

  const activeDocument = useMemo(
    () => documents.find((d) => d.id === activeDocumentId) || null,
    [documents, activeDocumentId],
  );

  const uploadDocument = useCallback(async (file) => {
    try {
      const created = await api.uploadDocument(file);
      await refreshDocuments();
      setActiveDocumentId(created.id);
      setSelectedIds((ids) => (ids.includes(created.id) ? ids : [...ids, created.id]));
      setMobileTab('viewer');
      return created;
    } catch (err) {
      throw handleApiError(err, { bannerCodes: ['MISSING_API_KEY', 'NETWORK'] });
    }
  }, [handleApiError, refreshDocuments]);

  const deleteDocument = useCallback(async (id) => {
    await api.deleteDocument(id);
    await refreshDocuments();
  }, [refreshDocuments]);

  const toggleSelected = useCallback((id) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }, []);

  const newChat = useCallback(async () => {
    const created = await api.createConversation({
      document_ids: selectedIds.length ? selectedIds : activeDocumentId ? [activeDocumentId] : [],
    });
    const full = await api.getConversation(created.id);
    setActiveConversation(full);
    await refreshConversations();
    setMobileTab('chat');
  }, [selectedIds, activeDocumentId, refreshConversations]);

  const openConversation = useCallback(async (id) => {
    const full = await api.getConversation(id);
    setActiveConversation(full);
    if (full.document_ids?.[0]) {
      setActiveDocumentId(full.document_ids[0]);
    }
    setMobileTab('chat');
  }, []);

  const renameConversation = useCallback(async (id, title) => {
    await api.renameConversation(id, title);
    await refreshConversations();
    setActiveConversation((current) => (current?.id === id ? { ...current, title } : current));
  }, [refreshConversations]);

  const deleteConversation = useCallback(async (id) => {
    await api.deleteConversation(id);
    setActiveConversation((current) => (current?.id === id ? null : current));
    await refreshConversations();
  }, [refreshConversations]);

  const sendQuestion = useCallback(async (question, mode) => {
    if (!question.trim()) return;
    setSending(true);
    try {
      let conv = activeConversation;
      if (!conv) {
        const created = await api.createConversation({
          document_ids: selectedIds,
        });
        conv = await api.getConversation(created.id);
        setActiveConversation(conv);
      }

      const documentIds =
        mode === 'single'
          ? activeDocumentId
            ? [activeDocumentId]
            : selectedIds
          : selectedIds;

      const optimisticUser = {
        id: `local-${Date.now()}`,
        role: 'user',
        content: question,
      };
      setActiveConversation((current) =>
        current && current.id === conv.id
          ? { ...current, messages: [...(current.messages || []), optimisticUser] }
          : { ...conv, messages: [...(conv.messages || []), optimisticUser] },
      );

     const documentId =
  mode === 'single'
    ? activeDocumentId
    : documentIds[0];

if (!documentId) {
  throw {
    code: 'NO_DOCUMENT',
    message: 'Upload a document before asking a question.',
  };
}

const result = await api.sendMessage(conv.id, {
  question,
  document_ids: documentIds,
});
const assistantMessage = {
  id: `assistant-${Date.now()}`,
  role: 'assistant',
  content: result.answer,
  citations: result.citations || [],
};

setActiveConversation((current) => {
  if (!current) return current;

  return {
    ...current,
    messages: [
      ...(current.messages || []),
      assistantMessage,
    ],
  };
});

return result;

      const full = await api.getConversation(conv.id);
      setActiveConversation(full);
      await refreshConversations();
      return result;
    } catch (err) {
      const mapped = handleApiError(err, { bannerCodes: ['MISSING_API_KEY', 'NETWORK'] });
      setActiveConversation((current) => {
        if (!current) return current;
        return {
          ...current,
          messages: [
            ...(current.messages || []),
            {
              id: `err-${Date.now()}`,
              role: 'assistant',
              error: mapped,
              content: mapped.message,
            },
          ],
        };
      });
      throw mapped;
    } finally {
      setSending(false);
    }
  }, [activeConversation, selectedIds, activeDocumentId, handleApiError, refreshConversations]);

  const scrollToPage = useCallback((page, highlightText, documentId) => {
    if (documentId) setActiveDocumentId(documentId);
    setCiteTarget({ page, text: highlightText, documentId, t: Date.now() });
    viewerApiRef.current.scrollToPage?.(page, highlightText);
    setMobileTab('viewer');
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      sidebarCollapsed,
      setSidebarCollapsed,
      mobileTab,
      setMobileTab,
      chatWidth,
      setChatWidth,
      documents,
      activeDocumentId,
      setActiveDocumentId,
      activeDocument,
      selectedIds,
      toggleSelected,
      pdfUrl,
      pdfError,
      setPdfError,
      conversations,
      activeConversation,
      healthOk,
      banner,
      setBanner,
      busy,
      setBusy,
      sending,
      citeTarget,
      viewerApiRef,
      uploadDocument,
      deleteDocument,
      newChat,
      openConversation,
      renameConversation,
      deleteConversation,
      sendQuestion,
      scrollToPage,
      refreshDocuments,
    }),
    [
      theme,
      sidebarCollapsed,
      mobileTab,
      chatWidth,
      documents,
      activeDocumentId,
      activeDocument,
      selectedIds,
      toggleSelected,
      pdfUrl,
      pdfError,
      conversations,
      activeConversation,
      healthOk,
      banner,
      busy,
      sending,
      citeTarget,
      uploadDocument,
      deleteDocument,
      newChat,
      openConversation,
      renameConversation,
      deleteConversation,
      sendQuestion,
      scrollToPage,
      refreshDocuments,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
