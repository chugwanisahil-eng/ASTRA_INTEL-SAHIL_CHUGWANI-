/**
 * App-wide state: documents, conversations, theme, viewer controls.
 *
 * Components never call fetch themselves.
 * They go through `api` via these actions.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  api,
  friendlyError,
} from '../api/client.js';


const AppContext = createContext(null);


export function AppProvider({ children }) {

  // =========================================================
  // UI STATE
  // =========================================================

  const [theme, setTheme] = useState('dark');

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [mobileTab, setMobileTab] =
    useState('viewer');

  const [chatWidth, setChatWidth] =
    useState(420);


  // =========================================================
  // DOCUMENT STATE
  // =========================================================

  const [documents, setDocuments] =
    useState([]);

  const [activeDocumentId, setActiveDocumentId] =
    useState(null);

  const [selectedIds, setSelectedIds] =
    useState([]);

  const [pdfUrl, setPdfUrl] =
    useState(null);

  const [pdfError, setPdfError] =
    useState(null);


  // =========================================================
  // CONVERSATION STATE
  // =========================================================

  const [conversations, setConversations] =
    useState([]);

  const [activeConversation, setActiveConversation] =
    useState(null);


  // =========================================================
  // APP STATUS
  // =========================================================

  const [healthOk, setHealthOk] =
    useState(false);

  const [banner, setBanner] =
    useState(null);

  const [busy, setBusy] =
    useState(false);

  const [sending, setSending] =
    useState(false);


  // =========================================================
  // PDF CITATION STATE
  // =========================================================

  const [citeTarget, setCiteTarget] =
    useState(null);


  const didBootChat =
    useRef(false);


  const viewerApiRef =
    useRef({
      scrollToPage: () => {},
    });


  // =========================================================
  // API ERROR HANDLER
  // =========================================================

  const handleApiError = useCallback(
    (
      err,
      {
        bannerCodes = [
          'MISSING_API_KEY',
          'NETWORK',
        ],
      } = {}
    ) => {

      const mapped = friendlyError(err);

      if (
        bannerCodes.includes(mapped.code)
      ) {
        setBanner(mapped);
      }

      if (
        mapped.code === 'NETWORK'
      ) {
        setHealthOk(false);
      }

      return mapped;
    },
    []
  );


  // =========================================================
  // REFRESH DOCUMENTS
  // =========================================================

  const refreshDocuments = useCallback(
    async () => {

      try {

        const list =
          await api.listDocuments();

        setDocuments(list);


        // -----------------------------------------------
        // Keep active document valid
        // -----------------------------------------------

        setActiveDocumentId(
          (current) => {

            if (
              current &&
              list.some(
                (d) => d.id === current
              )
            ) {
              return current;
            }

            return list[0]?.id ?? null;
          }
        );


        // -----------------------------------------------
        // Keep selected documents valid
        // -----------------------------------------------

        setSelectedIds(
          (current) => {

            const valid =
              current.filter(
                (id) =>
                  list.some(
                    (d) => d.id === id
                  )
              );


            if (valid.length) {
              return valid;
            }


            return list[0]
              ? [list[0].id]
              : [];
          }
        );

      } catch (err) {

        handleApiError(err);

      }

    },
    [handleApiError]
  );


  // =========================================================
  // REFRESH CONVERSATIONS
  // =========================================================

  const refreshConversations =
    useCallback(
      async () => {

        try {

          const list =
            await api.listConversations();

          setConversations(list);


          // ---------------------------------------------
          // Load first conversation on boot
          // ---------------------------------------------

          if (
            !didBootChat.current &&
            list[0]
          ) {

            didBootChat.current =
              true;

            const full =
              await api.getConversation(
                list[0].id
              );

            setActiveConversation(full);
          }

        } catch (err) {

          handleApiError(err);

        }

      },
      [handleApiError]
    );


  // =========================================================
  // HEALTH CHECK
  // =========================================================

  const pingHealth =
    useCallback(
      async () => {

        try {

          const res =
            await api.health();

          const ok =
            res?.status === 'ok';

          setHealthOk(ok);


          if (
            ok &&
            banner?.code === 'NETWORK'
          ) {
            setBanner(null);
          }

        } catch (err) {

          setHealthOk(false);

          handleApiError(err);

        }

      },
      [
        banner?.code,
        handleApiError,
      ]
    );


  // =========================================================
  // INITIAL APP LOAD
  // =========================================================

  useEffect(
    () => {

      refreshDocuments();

      refreshConversations();

      pingHealth();


      const timer =
        setInterval(
          pingHealth,
          15000
        );


      return () =>
        clearInterval(timer);

    },
    [
      refreshDocuments,
      refreshConversations,
      pingHealth,
    ]
  );


  // =========================================================
  // POLL DOCUMENT INGESTION STATUS
  // =========================================================

  useEffect(
    () => {

      const pending =
        documents.some(
          (d) =>
            d.status &&
            d.status !== 'ready' &&
            d.status !== 'failed'
        );


      if (!pending) {
        return undefined;
      }


      const timer =
        setInterval(
          refreshDocuments,
          900
        );


      return () =>
        clearInterval(timer);

    },
    [
      documents,
      refreshDocuments,
    ]
  );


  // =========================================================
  // LOAD ACTIVE PDF
  // =========================================================

  useEffect(
    () => {

      let revoked = null;


      async function loadFile() {

        setPdfError(null);


        if (!activeDocumentId) {

          setPdfUrl(null);

          return;
        }


        const meta =
          documents.find(
            (d) =>
              d.id === activeDocumentId
          );


        if (
          !meta ||
          (
            meta.status !== 'ready' &&
            meta.status !== 'failed'
          )
        ) {

          setPdfUrl(null);

          return;
        }


        try {

          const blob =
            await api.getDocumentFile(
              activeDocumentId
            );


          const url =
            URL.createObjectURL(blob);


          revoked = url;

          setPdfUrl(url);

        } catch (err) {

          const mapped =
            handleApiError(
              err,
              {
                bannerCodes: [
                  'MISSING_API_KEY',
                  'NETWORK',
                ],
              }
            );


          setPdfError(mapped);

          setPdfUrl(null);
        }
      }


      loadFile();


      return () => {

        if (revoked) {
          URL.revokeObjectURL(
            revoked
          );
        }

      };

    },
    [
      activeDocumentId,
      documents,
      handleApiError,
    ]
  );


  // =========================================================
  // ACTIVE DOCUMENT
  // =========================================================

  const activeDocument =
    useMemo(
      () =>
        documents.find(
          (d) =>
            d.id === activeDocumentId
        ) || null,

      [
        documents,
        activeDocumentId,
      ]
    );


  // =========================================================
  // UPLOAD DOCUMENT
  // =========================================================

  const uploadDocument =
    useCallback(
      async (file) => {

        try {

          const created =
            await api.uploadDocument(
              file
            );


          await refreshDocuments();


          setActiveDocumentId(
            created.id
          );


          setSelectedIds(
            (ids) =>
              ids.includes(created.id)
                ? ids
                : [
                    ...ids,
                    created.id,
                  ]
          );


          setMobileTab(
            'viewer'
          );


          return created;

        } catch (err) {

          throw handleApiError(
            err,
            {
              bannerCodes: [
                'MISSING_API_KEY',
                'NETWORK',
              ],
            }
          );

        }

      },
      [
        handleApiError,
        refreshDocuments,
      ]
    );


  // =========================================================
  // DELETE DOCUMENT
  // =========================================================

  const deleteDocument =
    useCallback(
      async (id) => {

        await api.deleteDocument(id);

        await refreshDocuments();

      },
      [refreshDocuments]
    );


  // =========================================================
  // SELECT / DESELECT DOCUMENT
  // =========================================================

  const toggleSelected =
    useCallback(
      (id) => {

        setSelectedIds(
          (ids) => {

            if (
              ids.includes(id)
            ) {

              return ids.filter(
                (x) => x !== id
              );

            }


            return [
              ...ids,
              id,
            ];

          }
        );

      },
      []
    );


  // =========================================================
  // CREATE NEW CHAT
  // =========================================================

  const newChat =
    useCallback(
      async () => {

        const created =
          await api.createConversation({
            document_ids:
              selectedIds.length
                ? selectedIds
                : activeDocumentId
                  ? [activeDocumentId]
                  : [],
          });


        const full =
          await api.getConversation(
            created.id
          );


        setActiveConversation(
          full
        );


        await refreshConversations();


        setMobileTab(
          'chat'
        );

      },
      [
        selectedIds,
        activeDocumentId,
        refreshConversations,
      ]
    );


  // =========================================================
  // OPEN EXISTING CONVERSATION
  // =========================================================

  const openConversation =
    useCallback(
      async (id) => {

        const full =
          await api.getConversation(
            id
          );


        setActiveConversation(
          full
        );


        if (
          full.document_ids?.[0]
        ) {

          setActiveDocumentId(
            full.document_ids[0]
          );

        }


        setMobileTab(
          'chat'
        );

      },
      []
    );


  // =========================================================
  // RENAME CONVERSATION
  // =========================================================

  const renameConversation =
    useCallback(
      async (
        id,
        title
      ) => {

        await api.renameConversation(
          id,
          title
        );


        await refreshConversations();


        setActiveConversation(
          (current) =>
            current?.id === id
              ? {
                  ...current,
                  title,
                }
              : current
        );

      },
      [refreshConversations]
    );


  // =========================================================
  // DELETE CONVERSATION
  // =========================================================

  const deleteConversation =
    useCallback(
      async (id) => {

        await api.deleteConversation(
          id
        );


        setActiveConversation(
          (current) =>
            current?.id === id
              ? null
              : current
        );


        await refreshConversations();

      },
      [refreshConversations]
    );


  // =========================================================
  // SEND QUESTION
  // =========================================================

  const sendQuestion =
    useCallback(
      async (
        question,
        mode
      ) => {

        if (!question.trim()) {
          return;
        }


        setSending(true);


        try {

          // =================================================
          // GET OR CREATE CONVERSATION
          // =================================================

          let conv =
            activeConversation;


          if (!conv) {

            const created =
              await api.createConversation({
                document_ids:
                  selectedIds,
              });


            conv =
              await api.getConversation(
                created.id
              );


            setActiveConversation(
              conv
            );
          }


          // =================================================
          // DETERMINE DOCUMENTS
          // =================================================

          const documentIds =
            mode === 'single'
              ? activeDocumentId
                ? [activeDocumentId]
                : selectedIds
              : selectedIds;


          // =================================================
          // ADD USER MESSAGE IMMEDIATELY
          // =================================================

          const optimisticUser = {

            id:
              `local-${Date.now()}`,

            role: 'user',

            content:
              question,

          };


          setActiveConversation(
            (current) => {

              if (!current) {
                return current;
              }


              return {

                ...current,

                messages: [
                  ...(current.messages || []),
                  optimisticUser,
                ],

              };

            }
          );


          // =================================================
          // DETERMINE PRIMARY DOCUMENT
          // =================================================

          const documentId =
            mode === 'single'
              ? activeDocumentId
              : documentIds[0];


          if (!documentId) {

            throw {
              code:
                'NO_DOCUMENT',

              message:
                'Upload a document before asking a question.',
            };

          }


          // =================================================
          // SEND TO BACKEND
          // =================================================

          const result =
            await api.sendMessage(
              conv.id,
              {
                question,
                document_ids:
                  documentIds,
                mode,
              }
            );


          // =================================================
          // BUILD ASSISTANT MESSAGE
          // =================================================

          const assistantMessage = {

            id:
              `assistant-${Date.now()}`,

            role:
              'assistant',

            /*
             * Normal Q&A uses result.answer.
             *
             * Compare mode intentionally has an empty answer
             * because the actual content lives inside compare.
             */

            content:
              result.answer || '',


            // Normal citations
            citations:
              result.citations || [],


            // Comparison sources
            sources:
              result.sources ||
              result.citations ||
              [],


            // =============================================
            // IMPORTANT COMPARE DATA
            // =============================================

            compare:
              result.compare ||
              null,

          };


          // =================================================
          // ADD ASSISTANT MESSAGE
          // =================================================

          setActiveConversation(
            (current) => {

              if (!current) {
                return current;
              }


              return {

                ...current,

                messages: [
                  ...(current.messages || []),
                  assistantMessage,
                ],

              };

            }
          );


          // =================================================
          // REFRESH CONVERSATION LIST
          // =================================================

          await refreshConversations();


          return result;


        } catch (err) {

          const mapped =
            handleApiError(
              err,
              {
                bannerCodes: [
                  'MISSING_API_KEY',
                  'NETWORK',
                ],
              }
            );


          // =================================================
          // SHOW ERROR MESSAGE
          // =================================================

          setActiveConversation(
            (current) => {

              if (!current) {
                return current;
              }


              return {

                ...current,

                messages: [

                  ...(current.messages || []),

                  {
                    id:
                      `err-${Date.now()}`,

                    role:
                      'assistant',

                    error:
                      mapped,

                    content:
                      mapped.message,
                  },

                ],

              };

            }
          );


          throw mapped;


        } finally {

          setSending(false);

        }

      },
      [
        activeConversation,
        selectedIds,
        activeDocumentId,
        handleApiError,
        refreshConversations,
      ]
    );


  // =========================================================
  // SCROLL TO PDF PAGE
  // =========================================================

  const scrollToPage =
    useCallback(
      (
        page,
        highlightText,
        documentId
      ) => {

        /*
         * If the citation belongs to another document,
         * switch the active PDF first.
         */

        if (documentId) {

          setActiveDocumentId(
            documentId
          );

        }


        setCiteTarget({
          page,
          text:
            highlightText,
          documentId,
          t:
            Date.now(),
        });


        viewerApiRef.current
          .scrollToPage?.(
            page,
            highlightText
          );


        setMobileTab(
          'viewer'
        );

      },
      []
    );


  // =========================================================
  // CONTEXT VALUE
  // =========================================================

  const value =
    useMemo(
      () => ({

        // -----------------------------------------------
        // UI
        // -----------------------------------------------

        theme,
        setTheme,

        sidebarCollapsed,
        setSidebarCollapsed,

        mobileTab,
        setMobileTab,

        chatWidth,
        setChatWidth,


        // -----------------------------------------------
        // DOCUMENTS
        // -----------------------------------------------

        documents,

        activeDocumentId,
        setActiveDocumentId,

        activeDocument,

        selectedIds,
        toggleSelected,

        pdfUrl,

        pdfError,
        setPdfError,


        // -----------------------------------------------
        // CONVERSATIONS
        // -----------------------------------------------

        conversations,

        activeConversation,


        // -----------------------------------------------
        // STATUS
        // -----------------------------------------------

        healthOk,

        banner,
        setBanner,

        busy,
        setBusy,

        sending,


        // -----------------------------------------------
        // PDF CITATIONS
        // -----------------------------------------------

        citeTarget,

        viewerApiRef,


        // -----------------------------------------------
        // ACTIONS
        // -----------------------------------------------

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

        // UI
        theme,
        sidebarCollapsed,
        mobileTab,
        chatWidth,

        // Documents
        documents,
        activeDocumentId,
        activeDocument,
        selectedIds,
        toggleSelected,
        pdfUrl,
        pdfError,

        // Conversations
        conversations,
        activeConversation,

        // Status
        healthOk,
        banner,
        busy,
        sending,

        // Citation
        citeTarget,

        // Actions
        uploadDocument,
        deleteDocument,
        newChat,
        openConversation,
        renameConversation,
        deleteConversation,
        sendQuestion,
        scrollToPage,
        refreshDocuments,

      ]
    );


  // =========================================================
  // PROVIDER
  // =========================================================

  return (
    <AppContext.Provider
      value={value}
    >
      {children}
    </AppContext.Provider>
  );
}


// =========================================================
// useApp HOOK
// =========================================================

export function useApp() {

  const ctx =
    useContext(
      AppContext
    );


  if (!ctx) {

    throw new Error(
      'useApp must be used inside AppProvider'
    );

  }


  return ctx;
}