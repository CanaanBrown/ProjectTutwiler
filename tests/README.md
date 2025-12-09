# Mission Control Dashboard Tests

This directory contains Playwright end-to-end tests for the Mission Control Dashboard.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Running Tests

### Run all tests:
```bash
npm test
```

### Run tests in UI mode (interactive):
```bash
npm run test:ui
```

### Run tests in headed mode (see browser):
```bash
npm run test:headed
```

### Run tests in debug mode:
```bash
npm run test:debug
```

### View test report:
```bash
npm run test:report
```

## Prerequisites

Before running tests, ensure:
1. The Mission Control API server is running on `http://localhost:5095`
2. The database is configured and accessible (or tests will handle API errors gracefully)

## Test Coverage

The test suite covers:
- Role selection (Admin/User)
- Dashboard navigation
- Metrics display
- Alert management
- Site filtering
- Form submissions
- Admin features (Patches, Controls)
- Incident reporting
- Error handling

## Environment Variables

- `BASE_URL`: Override the base URL (default: `http://localhost:5095`)

Example:
```bash
BASE_URL=https://mission-control-api-dcb6ff343216.herokuapp.com npm test
```

