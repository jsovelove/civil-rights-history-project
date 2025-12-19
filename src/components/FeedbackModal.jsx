import { useState, useEffect, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

/**
 * Modal for submitting feedback on selected content
 */
export default function FeedbackModal({ selectedText, sectionLabel, onSubmit, onClose, contextDetails = [] }) {
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);
  const detailsToRender = Array.isArray(contextDetails)
    ? contextDetails.filter((detail) => detail && detail.value)
    : [];

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description.trim()) {
      alert('Please describe the issue before submitting.');
      return;
    }

    // Check for CAPTCHA token
    if (!captchaToken) {
      alert('Please complete the CAPTCHA verification before submitting.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        description: description.trim(),
        email: email.trim() || null,
        captchaToken, // Include CAPTCHA token in submission
      });
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Sorry, there was an error submitting your feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpired = () => {
    setCaptchaToken(null);
  };

  const handleBackdropClick = (e) => {
    // Only close if clicking directly on the backdrop, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleModalClick = (e) => {
    // Prevent any clicks inside the modal from closing it
    e.stopPropagation();
  };

  return (
    <div 
      data-feedback-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50 feedback-modal-backdrop"
      onClick={handleBackdropClick}
      onMouseDown={(e) => {
        // Stop all mousedown propagation from the modal container
        e.stopPropagation();
        // Only close if clicking directly on the backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={handleModalClick}
        onMouseDown={(e) => {
          // Prevent mousedown from propagating outside the modal
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="feedback-modal-title" className="text-xl font-semibold text-gray-900">
                Report an Issue
              </h2>
              {sectionLabel && (
                <p className="text-sm text-gray-500 mt-1">
                  Section: {sectionLabel}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Selected Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Text
            </label>
            <div className="bg-gray-50 border border-gray-300 rounded-md p-3 text-sm text-gray-700 max-h-32 overflow-y-auto">
              "{selectedText}"
            </div>
          </div>

          {/* Additional context */}
          {detailsToRender.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Context
              </label>
              <div className="bg-gray-50 border border-gray-300 rounded-md divide-y divide-gray-200">
                {detailsToRender.map(({ label, value }, index) => (
                  <div
                    key={`${label}-${index}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 gap-1"
                  >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {label}
                    </span>
                    <span className="text-sm text-gray-900 sm:text-right">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issue Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              What's the issue? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Describe what's inaccurate, biased, or needs attention..."
              rows={6}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Please be specific so we can address the issue accurately.
            </p>
          </div>

          {/* Email (Optional) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Your Email (optional)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="your.email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Helpful if we need to follow up with you.
            </p>
          </div>

          {/* CAPTCHA Verification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification <span className="text-red-500">*</span>
            </label>
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey="6LdF5zAsAAAAAGgaCJ6LkJnt9J3q36oVHNWdJ98u"
                onChange={handleCaptchaChange}
                onExpired={handleCaptchaExpired}
                theme="light"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

