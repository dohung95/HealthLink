import { afterEach, describe, expect, it, vi } from 'vitest';

const stomp = vi.hoisted(() => ({
  subscribe: vi.fn(),
  activate: vi.fn(),
  deactivate: vi.fn(),
}));

vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn(function Client(config) {
    Object.assign(this, stomp, { config });
  }),
}));

vi.mock('sockjs-client', () => ({
  default: vi.fn(),
}));

import websocketService from './websocketService';

describe('websocketService AI CDS subscription', () => {
  afterEach(() => {
    websocketService.disconnect();
    vi.clearAllMocks();
  });

  it('subscribes to the doctor CDS queue, forwards raw payload, and cleans up', () => {
    const unsubscribe = vi.fn();
    stomp.subscribe.mockImplementation((_destination, handler) => {
      handler({
        body: JSON.stringify({
          runId: 'run-synthetic-1',
          status: 'GENERATING_LOCAL',
          errorCode: null,
        }),
      });
      return { unsubscribe };
    });
    websocketService.client = {
      subscribe: stomp.subscribe,
      deactivate: stomp.deactivate,
    };
    websocketService.connected = true;
    const callback = vi.fn();

    const cleanup = websocketService.subscribeToCdsRuns(callback);

    expect(stomp.subscribe).toHaveBeenCalledWith(
      '/user/queue/ai-cds',
      expect.any(Function),
    );
    expect(callback).toHaveBeenCalledWith({
      runId: 'run-synthetic-1',
      status: 'GENERATING_LOCAL',
      errorCode: null,
    });

    cleanup();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
