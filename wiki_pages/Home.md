# Civil Rights History Project - Technical Documentation

Welcome to the technical documentation for the Civil Rights History Project. This documentation provides in-depth information about the architecture, components, data models, and development patterns used in the application.

## About the Project

The Civil Rights History Project is a React-based web application powered by Large Language Models (LLMs) for analyzing, exploring, and creating playlists from civil rights oral history interviews from the Library of Congress collection: https://www.loc.gov/collections/civil-rights-history-project

The platform leverages LLMs to automatically process interview transcripts, extracting structured metadata including summaries, timestamps, and keywords. These AI-generated insights power the application's features for keyword-based searching, playlist creation, transcript summarization, and visualizations that help users explore connections between different interviews and topics.

## Documentation Sections

### Architecture
- [Architecture Overview](architecture-overview): High-level system architecture, component relationships, and data flow
- [Firebase Integration](firebase-integration): Details on Firebase authentication and Firestore database structure
- [OpenAI API Integration](openai-integration): Implementation of LLM-powered transcript processing

### Components & Pages
- [Component Documentation](component-documentation): Detailed documentation of all UI components
- [Page Documentation](page-documentation): Documentation of all application pages and their relationships
- [Node System Documentation](node-system): Information about the flow diagram node system

### Development Guides
- [Installation and Setup](installation-setup): Getting started with local development
- [Contributing Guidelines](contributing-guidelines): Coding standards, pull request process, and best practices
- [Testing Guide](testing-guide): How to write and run tests for the application

### API Reference
- [Utility Functions](utility-functions): Documentation of shared utility functions
- [Custom Hooks](custom-hooks): Documentation of React hooks used throughout the application
- [Context APIs](context-apis): Details of React Context implementations

## Getting Started

If you're new to the project, we recommend starting with the following documentation:

1. [Installation and Setup](installation-setup) to get your development environment running
2. [Architecture Overview](architecture-overview) to understand the system structure
3. [Component Documentation](component-documentation) to learn about available UI components
4. [Page Documentation](page-documentation) to see how components are assembled into pages

## Resources

- [GitHub Repository](https://github.com/jsovelove/civil-rights-history-project)
- [Library of Congress Civil Rights History Project](https://www.loc.gov/collections/civil-rights-history-project)
- [React Documentation](https://react.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs/overview)

## Contributing to Documentation

This documentation is maintained in the GitHub wiki. To contribute:

1. Clone the wiki repository: `git clone https://github.com/jsovelove/civil-rights-history-project.wiki.git`
2. Make your changes to existing files or add new markdown files
3. Commit and push your changes to update the wiki

Please follow these guidelines when contributing to documentation:
- Use clear, concise language
- Include code examples where appropriate
- Link to related documentation sections
- Update the table of contents when adding new pages
- Use proper Markdown formatting for readability 