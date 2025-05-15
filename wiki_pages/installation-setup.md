# Installation and Setup Guide

This document provides detailed instructions for setting up and running the Civil Rights History Project application.

## System Requirements

Before you begin, ensure your system meets the following requirements:

- **Node.js**: v14.0.0 or higher
- **npm**: v6.0.0 or higher (comes with Node.js) or **yarn**: v1.22.0 or higher
- **Git**: For cloning the repository
- **Modern web browser**: Chrome, Firefox, Safari, or Edge (latest versions recommended)
- **Internet connection**: Required for API calls and Firebase services

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/jsovelove/civil-rights-history-project.git
cd civil-rights-history-project
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using yarn:
```bash
yarn
```

### 3. Environment Configuration

Create a `.env` file in the root directory with the following environment variables:

```
# OpenAI API configuration
VITE_OPENAI_API_KEY=your_openai_api_key
```

#### Obtaining API Keys

- **OpenAI API Key**: 
  1. Create an account at [OpenAI](https://platform.openai.com/)
  2. Navigate to the API section
  3. Generate a new API key
  4. Copy the key to your `.env` file

### 4. Start the Development Server

Using npm:
```bash
npm run dev
```

Or using yarn:
```bash
yarn dev
```

The application will be available at [http://localhost:5173](http://localhost:5173) (Vite's default port).

## Firebase Configuration

The application uses Firebase for authentication and data storage. The default configuration connects to the project's shared database, which is already set up and ready to use. No additional Firebase setup is required for basic usage and development.

If you need to check the data structure or authenticate during development, use the default Firebase credentials that are already included in the application.

## Building for Production

### 1. Create a Production Build

Using npm:
```bash
npm run build
```

Or using yarn:
```bash
yarn build
```

This will generate optimized files in the `dist` directory.

### 2. Preview the Production Build

Using npm:
```bash
npm run preview
```

Or using yarn:
```bash
yarn preview
```

### 3. Deployment

#### GitHub Pages

The project includes a script for deploying to GitHub Pages:

```bash
npm run deploy
# or
yarn deploy
```

#### Other Hosting Options

- **Firebase Hosting**:
  1. Install Firebase CLI: `npm install -g firebase-tools`
  2. Login: `firebase login`
  3. Initialize: `firebase init` (select Hosting and your project)
  4. Deploy: `firebase deploy`

- **Vercel**:
  1. Install Vercel CLI: `npm install -g vercel`
  2. Deploy: `vercel`

- **Netlify**:
  1. Install Netlify CLI: `npm install -g netlify-cli`
  2. Deploy: `netlify deploy`

## Troubleshooting

### Common Issues

#### API Key Issues
- Error: "Invalid API key"
  - Verify your OpenAI API key is correct and has sufficient credits
  - Check that the environment variable is properly set in `.env`

#### Authentication Issues
- Default test user credentials:
  - Email: `test@civilrights.org`
  - Password: `civilrights123`
  - Note: These credentials are for development purposes only

#### Build Errors
- Check Node.js version compatibility
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and reinstall dependencies

### Getting Help

- Open an issue on the [GitHub repository](https://github.com/jsovelove/civil-rights-history-project/issues)
- Check existing issues for similar problems and solutions

## Development Workflow

### Project Structure

```
/src
  /components       # Reusable UI components
    /auth           # Authentication components
    /common         # Common components (Layout, Sidebar)
    /nodes          # Node components for flow interface
    /visualization  # Data visualization components
  /contexts         # React Context providers
  /hooks            # Custom React hooks
  /pages            # Application pages
  /services         # Firebase and external API services
  /utils            # Utility functions
  App.jsx           # Main application component
  main.jsx          # Entry point
```

### Development Commands

- `npm run dev`: Start development server
- `npm run lint`: Run ESLint for code quality
- `npm run build`: Create production build
- `npm run preview`: Preview production build
- `npm run docs`: Generate JSDoc documentation

## Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/guide/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Flow Documentation](https://reactflow.dev/docs/introduction/)

## License

This project is open source and available under the [MIT License](LICENSE). 