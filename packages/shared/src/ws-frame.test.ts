import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EventEmitter } from 'node:events';
import {
  getMessageBody,
  resolveAppWebSocketBinary,
  sendTunnelWsMessage,
  shouldUseBinaryBody,
  TunnelMessageAssembler,
} from './ws-frame.js';

class MockSocket extends EventEmitter {
  readonly frames: Array<string | Buffer> = [];

  send(data: string | Buffer): void {
    this.frames.push(data);
  }
}

describe('ws-frame', () => {
  it('prefers binary bodies at the threshold', () => {
    assert.equal(shouldUseBinaryBody(Buffer.alloc(1023)), false);
    assert.equal(shouldUseBinaryBody(Buffer.alloc(1024)), true);
  });

  it('sends large responses as JSON metadata plus binary frame', () => {
    const socket = new MockSocket();
    const body = Buffer.alloc(2048, 1);

    sendTunnelWsMessage(
      socket,
      {
        type: 'response',
        id: 'req-1',
        status: 200,
        headers: { 'content-type': 'application/javascript' },
      },
      body,
    );

    assert.equal(socket.frames.length, 2);
    assert.equal(typeof socket.frames[0], 'string');
    assert.match(String(socket.frames[0]), /"bodyEncoding":"binary"/);
    assert.ok(Buffer.isBuffer(socket.frames[1]));
    assert.equal(socket.frames[1].length, 2048);
  });

  it('keeps small responses as base64 JSON', () => {
    const socket = new MockSocket();
    const body = Buffer.from('hello');

    sendTunnelWsMessage(
      socket,
      {
        type: 'response',
        id: 'req-2',
        status: 200,
        headers: {},
      },
      body,
    );

    assert.equal(socket.frames.length, 1);
    assert.match(String(socket.frames[0]), /"body":"aGVsbG8="/);
  });

  it('reassembles binary response frames', () => {
    const assembler = new TunnelMessageAssembler();
    const first = assembler.feed(
      JSON.stringify({
        type: 'response',
        id: 'req-3',
        status: 200,
        headers: {},
        bodyEncoding: 'binary',
      }),
    );
    assert.equal(first, null);

    const second = assembler.feed(Buffer.from('chunk-data'));
    assert.equal(second?.type, 'response');
    assert.ok(second);
    assert.equal(getMessageBody(second).toString('utf8'), 'chunk-data');
  });

  it('preserves ws-message binary opcode flag through binary transport', () => {
    const socket = new MockSocket();
    const body = Buffer.alloc(2048, 0x7b); // starts with `{` but must stay binary

    sendTunnelWsMessage(
      socket,
      {
        type: 'ws-message',
        id: 'ws-1',
        binary: true,
      },
      body,
    );

    assert.equal(socket.frames.length, 2);
    assert.match(String(socket.frames[0]), /"binary":true/);
    assert.match(String(socket.frames[0]), /"bodyEncoding":"binary"/);
  });
});

describe('resolveAppWebSocketBinary', () => {
  it('honors an explicit binary flag', () => {
    assert.equal(resolveAppWebSocketBinary(Buffer.from('{"a":1}'), true), true);
    assert.equal(resolveAppWebSocketBinary(Buffer.from([0xff, 0x00]), false), false);
  });

  it('falls back to JSON-text heuristic for legacy peers', () => {
    assert.equal(resolveAppWebSocketBinary(Buffer.from('{"type":"ok"}'), undefined), false);
    assert.equal(resolveAppWebSocketBinary(Buffer.from([0x00, 0x01, 0x02]), undefined), true);
    assert.equal(resolveAppWebSocketBinary(Buffer.alloc(0), undefined), false);
  });
});
