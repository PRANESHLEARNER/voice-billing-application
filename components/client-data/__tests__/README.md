# Client Data Tests

This directory contains test files for the Client Data Intake feature.

## Files

- `client-data-wizard-test-template.tsx` - Template file showing test structure and examples

## Setup

To run the tests, you need to install the following dependencies:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest @types/jest
```

## Usage

1. Copy the template file to `client-data-wizard.test.tsx`
2. Uncomment the test code
3. Install the required dependencies
4. Run tests with `npm test`

## Test Coverage

The template covers:
- Component rendering
- Form validation
- User interactions
- Error scenarios
- Multi-language support

## Notes

- Tests are currently commented out to avoid TypeScript errors in development
- The inline `useClientData` hook in the main component provides mock functionality
- Tests use Jest and React Testing Library for comprehensive coverage
