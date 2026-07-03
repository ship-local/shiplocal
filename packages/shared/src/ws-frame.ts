import {
  decodeBody,
  encodeBody,
  parseTunnelMessage,
  type TunnelMessage,
  type TunnelRequestMessage,
  type TunnelResponseMessage,
  type TunnelWebSocketMessage,
} from './protocol.js';

export const MIN_BINARY_BODY_BYTES = 1024;

export type TunnelWsSender = {
  send(data: string | Buffer): void;
};

export type TunnelMessageWithBody = TunnelMessage & {
  bodyBuffer?: Buffer;
};

export type TunnelResponseWithBody = TunnelResponseMessage & {
  bodyBuffer?: Buffer;
};

type BinaryEnvelope =
  | TunnelRequestMessage
  | TunnelResponseMessage
  | TunnelWebSocketMessage;

function isBinaryEnvelope(message: TunnelMessage): message is BinaryEnvelope {
  return (
    (message.type === 'request' ||
      message.type === 'response' ||
      message.type === 'ws-message') &&
    message.bodyEncoding === 'binary'
  );
}

export function shouldUseBinaryBody(body: Buffer): boolean {
  return body.length >= MIN_BINARY_BODY_BYTES;
}

export function getMessageBody(message: TunnelMessageWithBody): Buffer {
  if (message.bodyBuffer) return message.bodyBuffer;
  if (message.type === 'request' || message.type === 'response' || message.type === 'ws-message') {
    return decodeBody(message.body);
  }
  return Buffer.alloc(0);
}

export function sendTunnelWsMessage(
  socket: TunnelWsSender,
  message: TunnelMessage,
  body: Buffer = Buffer.alloc(0),
): void {
  const hasBody = body.length > 0;

  if (hasBody && shouldUseBinaryBody(body)) {
    const { body: omittedBody, ...envelope } = message as BinaryEnvelope & { body?: string };
    void omittedBody;
    socket.send(JSON.stringify({ ...envelope, bodyEncoding: 'binary' }));
    socket.send(body);
    return;
  }

  if (message.type === 'request' || message.type === 'response' || message.type === 'ws-message') {
    socket.send(
      JSON.stringify({
        ...message,
        body: hasBody ? encodeBody(body) : message.body,
      }),
    );
    return;
  }

  socket.send(JSON.stringify(message));
}

export class TunnelMessageAssembler {
  private pending: BinaryEnvelope | null = null;

  feed(raw: unknown, isBinary = false): TunnelMessageWithBody | null {
    const buffer = rawDataToBuffer(raw);

    if (isBinary || (this.pending !== null && !isJsonText(buffer))) {
      if (!this.pending) return null;

      const envelope = this.pending;
      this.pending = null;

      return {
        ...envelope,
        body: undefined,
        bodyBuffer: buffer,
      };
    }

    const message = parseTunnelMessage(buffer.toString('utf8')) as TunnelMessageWithBody;

    if (isBinaryEnvelope(message)) {
      this.pending = message;
      return null;
    }

    return message;
  }

  reset(): void {
    this.pending = null;
  }
}

function isJsonText(buffer: Buffer): boolean {
  const first = buffer[0];
  return first === 0x7b || first === 0x5b;
}

function rawDataToBuffer(raw: unknown): Buffer {
  if (typeof raw === 'string') return Buffer.from(raw, 'utf8');
  if (Buffer.isBuffer(raw)) return raw;
  if (Array.isArray(raw)) return Buffer.concat(raw);
  if (raw instanceof ArrayBuffer) return Buffer.from(raw);
  if (ArrayBuffer.isView(raw)) return Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
  return Buffer.from(String(raw));
}
