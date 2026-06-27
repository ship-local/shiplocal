---
title: How ShipLocal Works Under the Hood
subtitle: From CLI registration to WebSocket forwarding, subdomain routing, response rewriting, and feedback capture.
date: 2026-06-27
description: A practical architecture walkthrough of how ShipLocal turns a local development server into a public preview URL, forwards requests over WebSocket, and layers collaboration features on top of the tunnel.
series: ShipLocal build series
series_order: 4
---

_Article 4 in the ShipLocal build series - the architecture walkthrough._

ShipLocal looks simple from the outside:

```bash
shiplocal 3000
```

The CLI prints a public URL:

```text
https://bright-panda.shiplocal.cloud
```

You send that URL to a client. They open it. Your local app responds.

Behind that small loop is a reverse proxy, a WebSocket control channel, a tunnel registry, request/response serialization, local HTTP forwarding, header rewriting, optional password protection, feedback overlay injection, and a dashboard that turns tunnel activity into a collaboration workflow.

This article walks through the normal architecture: not the beginner version, not the painful production edge cases, but the core system as it is designed to work.

---

## The high-level architecture

ShipLocal is split into a few packages and apps:

| Piece            | Responsibility                                                             |
| ---------------- | -------------------------------------------------------------------------- |
| CLI              | User-facing command that starts a tunnel from the developer machine        |
| Tunnel client    | Maintains the WebSocket connection and forwards requests to localhost      |
| Server           | Authenticates tunnel sessions, routes public traffic, and proxies requests |
| Shared package   | Protocol schemas, constants, URL helpers, and slug utilities               |
| Dashboard        | Shows projects, tunnels, and feedback                                      |
| Feedback overlay | Browser script injected into HTML previews for client comments             |

The runtime path looks like this:

```text
Browser
  -> https://subdomain.shiplocal.cloud
  -> ShipLocal server
  -> WebSocket message to CLI
  -> HTTP request to localhost:<port>
  -> response over WebSocket
  -> ShipLocal server
  -> Browser
```

The browser thinks it is talking to a normal HTTPS website. The local app thinks it is receiving a normal HTTP request from the developer's machine. ShipLocal sits in the middle and translates between the two.

---

## Why the tunnel uses WebSocket

The hardest constraint is that a laptop usually cannot receive inbound internet traffic directly.

Most developers are behind:

- a home or office router
- NAT
- a changing IP address
- network firewalls
- Wi-Fi that can drop without warning

So ShipLocal does not try to open a port on the developer's network.

Instead, the CLI opens an outbound WebSocket connection to the ShipLocal server:

```text
Developer laptop -> ShipLocal server
```

Outbound connections are allowed on most networks. Once the socket is open, the server can send request messages down that connection whenever somebody visits the public URL.

This turns the CLI into a remote-controlled HTTP client. It receives instructions from the server, calls the local app, and sends back the result.

---

## The tunnel protocol

ShipLocal keeps the protocol deliberately small.

The shared package defines message types such as:

| Message      | Direction     | Purpose                                 |
| ------------ | ------------- | --------------------------------------- |
| `register`   | CLI -> server | Create or reconnect a tunnel            |
| `registered` | server -> CLI | Return public URL and tunnel metadata   |
| `request`    | server -> CLI | Ask the CLI to call the local app       |
| `response`   | CLI -> server | Return the local app's response         |
| `ping`       | server -> CLI | Check that the tunnel is alive          |
| `pong`       | CLI -> server | Confirm that the CLI is still connected |
| `error`      | server -> CLI | Report registration/auth failures       |
| `terminated` | server -> CLI | Tell the CLI the tunnel was stopped     |

A registration message is roughly:

```json
{
  "type": "register",
  "localPort": 3000,
  "token": "sl_...",
  "projectSlug": "myapp",
  "targetName": "web"
}
```

A proxied HTTP request becomes:

```json
{
  "type": "request",
  "id": "6f4a...",
  "method": "GET",
  "path": "/pricing",
  "query": "",
  "headers": {
    "accept": "text/html"
  }
}
```

The response uses the same ID:

```json
{
  "type": "response",
  "id": "6f4a...",
  "status": 200,
  "headers": {
    "content-type": "text/html; charset=utf-8"
  },
  "body": "base64-encoded-body"
}
```

The ID matters because real web pages do not load one thing at a time. A single page may trigger requests for HTML, JavaScript chunks, CSS, fonts, images, API routes, source maps, and WebSocket upgrades. ShipLocal needs a stable way to pair each browser request with the matching tunnel response.

---

## What happens when the CLI starts

When you run:

```bash
shiplocal 3000
```

the CLI does a few things before it prints the public URL.

First, it validates the port. Then it resolves the ShipLocal API URL and loads the saved API token from local config. If the token is missing or invalid, the CLI stops and asks you to log in.

Next, it checks whether anything is listening on the requested local port. This is a warning, not a hard failure. The tunnel can still start, but the public URL will return a local connection error until your app is running.

Then the tunnel client opens a WebSocket connection to the server's tunnel endpoint and sends a `register` message.

The server checks the token, resolves the user, decides which project and target this tunnel belongs to, allocates a subdomain, stores or updates the tunnel record, and creates an in-memory live session.

Finally, the server replies with `registered`, including:

- tunnel ID
- subdomain
- public URL
- expiry time
- project slug and target name when relevant
- sibling target URLs for multi-port projects

Only then does the CLI print the public URL.

---

## How subdomain routing works

The public URL is built around a subdomain:

```text
https://bright-panda.shiplocal.cloud
```

When a request reaches the ShipLocal server, the server parses the host and extracts the tunnel subdomain.

The important question is:

> Which live tunnel owns this subdomain right now?

The tunnel manager keeps several indexes in memory:

- session ID -> live session
- subdomain -> session ID
- database tunnel ID -> session ID

That makes lookup cheap. If a browser asks for `bright-panda.shiplocal.cloud`, the server can quickly find the live WebSocket connected to that tunnel.

If no live session exists, the server cannot forward the request. The tunnel is offline, expired, stopped, or not connected from the CLI.

The database stores tunnel metadata, but the active WebSocket lives in memory. That distinction is important: the database can remember that a tunnel exists, but only the in-memory session can actually carry live traffic.

---

## The HTTP proxy path

Once the server finds the live tunnel session, the proxy path begins.

The server collects the incoming request:

- HTTP method
- path
- query string
- headers
- body, if present

It wraps those fields into a `request` message and sends the message over the tunnel WebSocket.

The tunnel manager also creates a pending request entry. That entry stores:

- the request ID
- a resolver for the eventual response
- a timeout

If the CLI responds before the timeout, the pending request resolves. If not, the server rejects the browser request with a gateway-style failure instead of waiting forever.

On the CLI side, the tunnel client receives the `request` message and forwards it to the local app using Node's HTTP client.

For a request like:

```text
https://bright-panda.shiplocal.cloud/pricing?plan=pro
```

the CLI calls:

```text
http://127.0.0.1:3000/pricing?plan=pro
```

or, if needed:

```text
http://[::1]:3000/pricing?plan=pro
```

That IPv4/IPv6 fallback matters because `localhost` is not always the same address on every machine or framework. Some dev servers bind to IPv4, some to IPv6, and some to both.

---

## Header and body handling

HTTP proxying is not just copying strings around.

ShipLocal has to be careful with headers that only make sense for one network hop. These are usually called hop-by-hop headers.

Examples include:

- `connection`
- `keep-alive`
- `transfer-encoding`
- `upgrade`
- `proxy-authenticate`

Those headers describe the connection between two immediate peers. They should not be blindly forwarded across a multi-step tunnel.

ShipLocal also rewrites the `host` header before calling the local app:

```text
host: localhost:3000
```

That helps local frameworks behave as if the request arrived directly on the local port.

Bodies are encoded before they travel through the tunnel message. Binary data cannot safely be placed inside JSON as raw bytes, so ShipLocal base64-encodes request and response bodies.

This is simple and reliable, but it has trade-offs:

- it increases payload size
- it requires buffering
- it creates practical maximum body limits

That is why the system has request timeouts and body size caps. A tunnel should fail clearly instead of silently hanging forever.

---

## Response rewriting

When the local app responds, the CLI packages the status, headers, and body into a `response` message.

Before the server sends that response back to the browser, it applies a few safety rules.

Some response headers are stripped because they are no longer accurate after passing through the tunnel. The most important examples are:

- `content-length`
- `content-encoding`
- `transfer-encoding`

This is especially important around compression. Node's HTTP stack can decompress a response while the original compression headers remain present. If those stale headers reach the browser, the browser may try to decompress bytes that are already decompressed.

The result is a broken page.

So ShipLocal treats response headers as part of the proxy contract, not as passive metadata.

For project-based multi-target previews, response rewriting also helps with cross-origin details like CORS and cookies between sibling preview URLs.

---

## Password-protected tunnels

Some preview links should not be open to anyone with the URL.

ShipLocal supports password-protected tunnels:

```bash
shiplocal 3000 --password secret123
```

During registration, the server stores a password hash with the tunnel session. When someone opens the public URL, the server can require an unlock step before forwarding traffic to the local app.

This keeps the protection at the tunnel layer. The user's app does not need to implement temporary preview authentication just to share work safely.

---

## Projects and multi-target tunnels

Single-port apps are straightforward:

```bash
shiplocal 3000
```

Modern apps often need more than one port:

```text
Frontend: localhost:3000
API:      localhost:4000
```

ShipLocal handles this with projects and named targets:

```bash
shiplocal 3000 --project myapp
shiplocal 4000 --project myapp --name api
```

The result is a coordinated preview environment:

```text
https://myapp.shiplocal.cloud
https://myapp-api.shiplocal.cloud
```

The project gives ShipLocal enough context to understand that those two tunnels belong together. That matters for dashboard grouping, sibling URL discovery, environment rewrites, CORS behavior, and cookie handling.

Without this, every tunnel is just an isolated public URL. With projects, ShipLocal can model the shape of a real full-stack local app.

---

## Feedback overlay injection

The tunnel is the transport layer. The feedback overlay is the collaboration layer.

When the server receives an HTML response from the local app, it can inject a script tag before returning the page to the browser:

```html
<script
  src="https://shiplocal.cloud/overlay.js"
  data-tunnel-id="..."
  data-api-url="https://shiplocal.cloud"
  defer
></script>
```

The overlay runs inside the preview page. It lets the client leave feedback with context, including:

- page URL
- message
- clicked coordinates
- element selector
- screenshot
- metadata

The feedback is posted back to ShipLocal and stored against the tunnel. The dashboard can then show comments by project, tunnel, page, and time.

That is the product difference between a tunnel and a review workflow.

A tunnel answers:

> Can the client open my local app?

The overlay answers:

> Can the client tell me what to change in a way I can act on?

---

## Keeping sessions alive

Every live tunnel has an expiry and a heartbeat.

The server periodically sends `ping`. The CLI replies with `pong`. If the server stops receiving `pong` messages, it removes the live session and marks the tunnel offline.

This protects the system from stale sessions. Without heartbeats, the server could keep routing traffic to a socket that no longer exists.

The CLI also tries to reconnect after unexpected disconnects. On reconnect, it can reuse the known tunnel ID so the public URL can remain stable where possible.

This matters because tunnel URLs are often already in a client chat, browser tab, or feedback session. Reconnection should preserve continuity when it can.

---

## Why the server keeps live sessions in memory

The database stores long-lived information:

- users
- projects
- tunnels
- comments
- tunnel status
- password hashes
- expiry timestamps

But live traffic depends on open WebSocket objects. Those cannot be stored in a database. They are process memory objects.

So the server has two views of a tunnel:

- persistent record: what the tunnel is
- live session: whether it can carry traffic right now

This is why a dashboard can show a tunnel record even when the CLI is no longer connected. The record exists, but the live session does not.

In a multi-server deployment, this design also points to an important scaling question: traffic for a given tunnel must reach the server process that owns the WebSocket, or the live session registry needs to move into a shared routing layer.

For the current architecture, the in-memory registry keeps the implementation direct and fast.

---

## What ShipLocal is optimizing for

ShipLocal is not trying to be a general-purpose edge network or production hosting platform.

It is optimized for the development preview loop:

```text
Build locally
Share a real URL
Collect contextual feedback
Change the code
Refresh the preview
Repeat
```

That goal explains many of the architectural choices:

- WebSocket because the laptop starts the connection
- subdomains because public URLs need to be easy to share
- projects because real apps often use multiple local ports
- header rewriting because browsers and dev servers are picky
- overlay injection because access without feedback is only half the workflow
- dashboard storage because comments need to outlive a single page refresh

The result is a system that feels like a public website to the client, but stays local for the developer.

---

## The full request lifecycle

Here is the lifecycle end to end:

```text
1. Developer runs shiplocal 3000.

2. CLI opens a WebSocket to the ShipLocal server.

3. CLI sends a register message with token, local port, and project metadata.

4. Server authenticates the token and creates or reconnects a tunnel.

5. Server stores the live WebSocket session in the tunnel manager.

6. Server returns a public URL to the CLI.

7. Client opens the public URL in a browser.

8. Server parses the subdomain and finds the live tunnel session.

9. Server serializes the HTTP request into a tunnel request message.

10. CLI receives the message and forwards it to localhost.

11. Local app returns an HTTP response.

12. CLI serializes the response and sends it back over WebSocket.

13. Server matches the response to the pending browser request.

14. Server rewrites unsafe headers and optionally injects the feedback overlay.

15. Browser receives the final response.

16. Client feedback, if submitted, is stored and shown in the dashboard.
```

That is ShipLocal under the hood: a focused reverse proxy built around an outbound WebSocket, with collaboration features layered directly into the preview path.
