/**
 * Floating button that appears near selected text to report issues
 */
export default function SelectionFeedbackButton({ selection, onReport, disabled }) {
  if (!selection) return null;

  const handlePointerDown = (event) => {
    event.stopPropagation();
  };

  return (
    <button
      type="button"
      className="fixed z-[75] px-4 py-2 text-xs sm:text-sm font-semibold tracking-wide text-white bg-red-600 rounded-full shadow-lg hover:bg-red-500 transition disabled:opacity-70"
      style={{
        top: selection.position.top,
        left: selection.position.left,
      }}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      onClick={onReport}
      disabled={disabled}
    >
      {disabled ? 'Preparing feedback…' : 'Report issue'}
    </button>
  );
}

