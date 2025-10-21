/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'civil-red': '#F2483C',
        'civil-bg': '#EBEAE9',
      },
      fontFamily: {
        'heading': ['Acumin Pro', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        'body': ['Source Serif 4', 'Lora', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        'mono': ['Chivo Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      fontWeight: {
        'heading': '700', // Bold
        'body-medium': '500', // Medium
        'body-black': '900',  // Black
        'body': '400',    // Book/Regular
        'mono': '300',    // Light
      }
    },
  },
  plugins: [],
}