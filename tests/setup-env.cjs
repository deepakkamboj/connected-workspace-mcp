const { join } = require('node:path');
const { tmpdir } = require('node:os');

const testDirectory = join(tmpdir(), `pa-mcp-jest-${process.pid}`);
process.env.PA_MCP_TOKEN_PATH = join(testDirectory, 'tokens.json');
process.env.PA_MCP_LOG_PATH = join(testDirectory, 'pa-mcp.log');
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/oauth2callback';
process.env.LINKEDIN_API_VERSION = '202609';

global.__PA_MCP_TEST_DIRECTORY__ = testDirectory;
