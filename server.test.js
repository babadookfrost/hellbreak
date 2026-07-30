const WebSocket = require('ws');
const http = require('http');

jest.mock('ws', () => {
  const mWebSocketServer = {
    on: jest.fn(),
  };
  return {
    Server: jest.fn(() => mWebSocketServer),
  };
});

jest.mock('http', () => {
  const mServer = {
    listen: jest.fn(),
  };
  return {
    createServer: jest.fn(() => mServer),
  };
});

describe('Global connection message parsing', () => {
  it('should not crash when receiving invalid JSON', () => {
    require('./server');

    const wssInstance = new WebSocket.Server();
    const connectionCall = wssInstance.on.mock.calls.find(call => call[0] === 'connection');
    expect(connectionCall).toBeDefined();

    const connectionHandler = connectionCall[1];

    const mockWs = {
      on: jest.fn(),
      send: jest.fn(),
      readyState: 1, // WebSocket.OPEN
    };

    connectionHandler(mockWs);

    const messageCall = mockWs.on.mock.calls.find(call => call[0] === 'message');
    expect(messageCall).toBeDefined();

    const messageHandler = messageCall[1];

    // Send invalid JSON
    expect(() => {
      messageHandler('invalid{json');
    }).not.toThrow();

    // Ensure it didn't do anything else (like sending an error message back, since it ignores)
    expect(mockWs.send).not.toHaveBeenCalled();
  });
});
