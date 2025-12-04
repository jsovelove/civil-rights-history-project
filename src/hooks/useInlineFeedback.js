import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for inline text selection feedback functionality
 * Detects text selection and provides feedback submission handlers
 */
export function useInlineFeedback({ user, sectionLabel = 'Content' }) {
  const [selectionContext, setSelectionContext] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const MIN_SELECTION_LENGTH = 24;
    const BUTTON_WIDTH = 220;
    const EDGE_PADDING = 16;
    const scrollListenerOptions = { passive: true };

    const isNodeInsideContent = (node) => {
      if (!contentRef.current || !node) return false;
      const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      return element ? contentRef.current.contains(element) : false;
    };

    const getSectionLabel = (node) => {
      const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      return (
        element?.closest('[data-feedback-section]')?.getAttribute('data-feedback-section') || 
        sectionLabel
      );
    };

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionContext(null);
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length < MIN_SELECTION_LENGTH) {
        setSelectionContext(null);
        return;
      }

      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      if (!range) {
        setSelectionContext(null);
        return;
      }

      const ancestor = range.commonAncestorContainer;
      if (!isNodeInsideContent(ancestor)) {
        setSelectionContext(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (!rect || (rect.top === 0 && rect.bottom === 0 && rect.width === 0)) {
        setSelectionContext(null);
        return;
      }

      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const maxLeft = Math.max(EDGE_PADDING, viewportWidth - BUTTON_WIDTH - EDGE_PADDING);
      const left = clamp(
        rect.left + rect.width / 2 - BUTTON_WIDTH / 2,
        EDGE_PADDING,
        maxLeft
      );
      const top = clamp(rect.bottom + 12, EDGE_PADDING, viewportHeight - 56);

      setSelectionContext({
        text: text.slice(0, 1500),
        sectionLabel: getSectionLabel(ancestor),
        position: { top, left },
      });
    };

    const clearSelection = () => {
      // Don't clear selection if modal is open
      if (showFeedbackModal) return;
      setSelectionContext(null);
    };

    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange);
    document.addEventListener('touchend', handleSelectionChange);
    document.addEventListener('mousedown', clearSelection);
    window.addEventListener('scroll', clearSelection, scrollListenerOptions);

    return () => {
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('keyup', handleSelectionChange);
      document.removeEventListener('touchend', handleSelectionChange);
      document.removeEventListener('mousedown', clearSelection);
      window.removeEventListener('scroll', clearSelection, scrollListenerOptions);
    };
  }, [contentRef, showFeedbackModal, sectionLabel]);

  const handleReportIssue = useCallback(() => {
    if (!selectionContext) return;
    setShowFeedbackModal(true);
  }, [selectionContext]);

  const handleFeedbackSubmit = useCallback(async ({ description, email }) => {
    if (!selectionContext) return;

    const issueTitle = selectionContext.sectionLabel
      ? `Issue in ${selectionContext.sectionLabel}`
      : 'Issue with content';

    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');

      await addDoc(collection(db, 'feedback'), {
        title: issueTitle,
        description: description,
        selectedText: selectionContext.text,
        pageUrl: window.location.href,
        sectionLabel: selectionContext.sectionLabel || null,
        authorEmail: email,
        authorName: user?.displayName || null,
        userId: user?.uid || null,
        status: 'new',
        createdAt: serverTimestamp(),
      });

      alert('Thank you! Your feedback has been submitted.');
      console.log('Feedback saved to Firestore');

      // Clear selection
      const selection = window.getSelection ? window.getSelection() : null;
      selection?.removeAllRanges?.();
      setSelectionContext(null);
      setShowFeedbackModal(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }, [selectionContext, user]);

  const handleCloseFeedbackModal = useCallback(() => {
    setShowFeedbackModal(false);
    setSelectionContext(null);
    const selection = window.getSelection ? window.getSelection() : null;
    selection?.removeAllRanges?.();
  }, []);

  return {
    contentRef,
    selectionContext,
    showFeedbackModal,
    handleReportIssue,
    handleFeedbackSubmit,
    handleCloseFeedbackModal,
  };
}

