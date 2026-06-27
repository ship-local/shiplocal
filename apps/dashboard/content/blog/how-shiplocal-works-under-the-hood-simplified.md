---
title: How ShipLocal Works Under the Hood (Simplified)
subtitle: A beginner-friendly tour of what happens after you run shiplocal 3000.
date: 2026-06-27
description: A beginner-friendly explanation of how ShipLocal turns localhost into a public preview URL, forwards browser requests back to your laptop, and collects client feedback without a staging deploy.
series: ShipLocal build series
series_order: 3
---

_Article 3 in the ShipLocal build series - the beginner-friendly version._

If you have ever built a website locally, you have probably seen an address like this:

```text
http://localhost:3000
```

That address works on **your** computer because `localhost` means "this same machine."

But if you send `http://localhost:3000` to a client, it will not open your app. On their computer, `localhost` means **their** machine, not yours.

ShipLocal solves that problem by giving your local app a temporary public URL:

```text
https://bright-panda.shiplocal.cloud
```

Now your client can open a real link in their browser, while the app still runs on your laptop.

This article explains how that works in plain English.

---

## The simple mental model

Think of ShipLocal as a secure relay between the internet and your development server.

When you run:

```bash
shiplocal 3000
```

you are saying:

> "My app is running on port 3000. Please create a public URL and send traffic back here."

ShipLocal then creates a path like this:

```text
Client browser
    -> ShipLocal public URL
    -> ShipLocal server
    -> open connection to your CLI
    -> your local app on localhost:3000
```

The important idea is that the client never connects directly to your laptop. Your laptop opens an outbound connection to ShipLocal first, and ShipLocal reuses that connection to pass requests back and forth.

That is why it can work even when you are behind Wi-Fi, a home router, or a normal office network.

---

## The pieces involved

ShipLocal has three main parts.

### 1. The CLI

The CLI is the command you run in your terminal:

```bash
shiplocal 3000
```

It lives on your machine. Its job is to:

- check that you are logged in
- remember which local port you want to share
- open a WebSocket connection to ShipLocal
- receive incoming browser requests
- forward those requests to your local app
- send the response back through the tunnel

You can think of the CLI as a messenger standing next to your local app.

### 2. The server

The ShipLocal server is the public part of the system.

It is responsible for:

- creating a public URL
- remembering which CLI session owns that URL
- receiving browser requests from clients
- forwarding those requests to the right CLI
- sending the local app's response back to the browser
- storing tunnels, projects, and feedback

If the CLI is the messenger on your laptop, the server is the receptionist on the public internet.

### 3. The dashboard

The dashboard is the web app where you can see your tunnels, projects, and comments.

It is not the thing that makes the tunnel work. The tunnel works through the CLI and server. The dashboard is the place where the collaboration part becomes visible.

That distinction matters:

- the tunnel makes your local app reachable
- the dashboard helps you manage and review what happened

---

## Step 1: You log in

Before starting a tunnel, you run:

```bash
shiplocal login
```

This gives the CLI an API token. The token is how the CLI proves to the ShipLocal server that it belongs to your account.

Without this step, anyone could ask ShipLocal to create tunnels under anyone's account. So registration is authenticated.

Beginner version:

> Login gives the CLI a key. The server checks that key before creating a tunnel.

---

## Step 2: The CLI registers a tunnel

When you run:

```bash
shiplocal 3000
```

the CLI opens a WebSocket connection to the ShipLocal server.

A WebSocket is a long-lived connection. Unlike a normal HTTP request, it stays open. That makes it useful for tunnels because the server can send work back to the CLI later.

The CLI sends a registration message that says roughly:

```json
{
  "type": "register",
  "localPort": 3000,
  "token": "your_api_token"
}
```

The server checks the token, creates or updates a tunnel record, chooses a subdomain, and replies with a public URL:

```text
https://bright-panda.shiplocal.cloud
```

At this point, your terminal can print:

```text
Local:   http://localhost:3000
Public:  https://bright-panda.shiplocal.cloud
```

Nothing has visited your local app yet. ShipLocal has only created the route.

---

## Step 3: A client opens the public URL

Now imagine your client opens:

```text
https://bright-panda.shiplocal.cloud/pricing
```

The request reaches the ShipLocal server first.

The server looks at the hostname:

```text
bright-panda.shiplocal.cloud
```

Then it asks:

> "Which live tunnel owns the `bright-panda` subdomain?"

The tunnel manager keeps that answer in memory while the CLI is connected. It maps the subdomain to the correct live WebSocket session.

So now the server knows which CLI should receive the request.

---

## Step 4: The server packages the request

The browser made a normal HTTP request:

```http
GET /pricing
Host: bright-panda.shiplocal.cloud
```

The server turns that into a tunnel message:

```json
{
  "type": "request",
  "id": "unique-request-id",
  "method": "GET",
  "path": "/pricing",
  "headers": { ... }
}
```

That `id` is important. Many requests can be in flight at the same time: HTML, CSS, JavaScript, images, fonts, API calls, and more.

The request ID lets ShipLocal match each response to the browser request that caused it.

Beginner version:

> The server puts a label on every request so it can match the answer later.

---

## Step 5: The CLI forwards the request to localhost

The CLI receives the request message over the WebSocket.

Then it makes a normal HTTP request on your own machine:

```text
http://localhost:3000/pricing
```

Your local dev server does not need to know anything about ShipLocal. It just sees a request like any other browser request.

If you are running Next.js, Vite, Rails, Laravel, Django, Express, or another dev server, it responds the usual way.

That response might be:

- an HTML page
- a JavaScript bundle
- a CSS file
- an image
- JSON from an API route
- a redirect
- an error page

The CLI collects that response and sends it back to the ShipLocal server.

---

## Step 6: The response travels back to the browser

The local app returns something like:

```http
Status: 200
Content-Type: text/html
Body: <html>...</html>
```

The CLI packages that response into another tunnel message:

```json
{
  "type": "response",
  "id": "same-request-id",
  "status": 200,
  "headers": { ... },
  "body": "..."
}
```

The server finds the pending browser request with the same ID, copies over the status, headers, and body, and sends the response to the client.

From the client's point of view, they just loaded a normal website.

From your point of view, your local dev server handled the request.

That is the tunnel.

---

## Why the connection starts from your laptop

This part is easy to miss.

ShipLocal does not ask the internet to connect directly to your laptop. That would be hard because most laptops do not have a stable public address, and many networks block inbound traffic.

Instead, your CLI connects **out** to ShipLocal.

Outbound connections are normal. Your computer already makes them all day when you visit websites, call APIs, or install packages.

Once that WebSocket is open, ShipLocal can send request messages down the existing connection.

That is the trick:

> Your laptop starts the connection. ShipLocal uses that open connection to relay traffic back to your local app.

---

## What happens when the tunnel goes offline

The server sends regular `ping` messages to the CLI. The CLI replies with `pong`.

This is called a heartbeat.

It answers a simple question:

> "Is the CLI still there?"

If the CLI stops responding, ShipLocal marks the tunnel as offline and stops sending traffic to it.

This can happen when:

- you press `Ctrl+C`
- your laptop sleeps
- Wi-Fi drops
- the process crashes
- the tunnel expires

The CLI also has reconnect logic. If the connection drops unexpectedly, it tries to reconnect instead of making you start from scratch immediately.

---

## Where feedback fits in

ShipLocal is not only a tunnel. The goal is to make client review easier.

When ShipLocal sees an HTML response from your app, it can add a small feedback overlay script before the page reaches the browser.

In simplified form:

```text
Your app returns HTML
    -> ShipLocal adds feedback script
    -> Client sees the page with a comment button
```

That script knows which tunnel it belongs to. When a client leaves feedback, ShipLocal stores:

- the message
- the page URL
- the clicked position
- a selector for the element
- a screenshot
- useful metadata

Then you can see that feedback in the dashboard.

This is the difference between:

> "Can you make the thing on the left bigger?"

and:

> "On `/pricing`, the client clicked this exact card and left this comment."

The tunnel gets the client to the page. The overlay helps the feedback come back with context.

---

## What about full-stack apps?

Many apps use more than one local port.

For example:

```text
Frontend: localhost:3000
API:      localhost:4000
```

If you only expose the frontend, the browser may still try to call:

```text
http://localhost:4000/api/users
```

That will fail for the client, because again, their `localhost` is not your laptop.

ShipLocal supports grouping related tunnels under a project:

```bash
shiplocal 3000 --project myapp
shiplocal 4000 --project myapp --name api
```

That can produce coordinated URLs like:

```text
https://myapp.shiplocal.cloud
https://myapp-api.shiplocal.cloud
```

Now the frontend and API can both have public preview URLs. ShipLocal can also help with the boring browser details that show up in split apps, like CORS and cookies between related preview URLs.

Beginner version:

> A project lets multiple local ports behave like one preview environment.

---

## What ShipLocal does not change

ShipLocal does not deploy your app.

It does not copy your code to a server. It does not build a production bundle. It does not replace hosting.

Your app still runs on your machine.

That is the point.

ShipLocal is for the moment before deployment, when you want someone else to see and comment on the thing you are still building locally.

Use deployment when you are ready to ship.

Use ShipLocal when you are still iterating.

---

## The whole flow in one picture

Here is the full journey:

```text
1. Developer runs:
   shiplocal 3000

2. CLI connects to ShipLocal:
   "I have localhost:3000"

3. ShipLocal creates:
   https://bright-panda.shiplocal.cloud

4. Client opens the public URL.

5. ShipLocal receives the browser request.

6. ShipLocal sends that request over WebSocket to the CLI.

7. CLI forwards it to:
   http://localhost:3000

8. Local app responds.

9. CLI sends the response back to ShipLocal.

10. ShipLocal sends the response to the client.

11. If the response is HTML, ShipLocal can add the feedback overlay.

12. Client comments are saved and shown in the dashboard.
```

That is ShipLocal under the hood.

Not magic. Just a few carefully connected pieces:

- a CLI on your machine
- a public server
- a WebSocket tunnel
- a local HTTP forwarder
- a dashboard for collaboration
- a feedback overlay for context

The result is simple: your client gets a real URL, and you keep working locally.
