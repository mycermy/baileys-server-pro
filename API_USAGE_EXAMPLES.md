# Baileys WhatsApp Server Pro - API Usage Examples

A comprehensive guide for integrating with the Baileys WhatsApp Server Pro API.

## Overview

This API provides WhatsApp messaging capabilities through Baileys library, allowing you to send text messages, images, and documents programmatically.

## Base URL

```
http://localhost:3000/api
```

## Authentication

No authentication required for basic usage. Sessions are managed by session IDs.

## API Endpoints

### 1. Start a New WhatsApp Session

**Endpoint:** `POST /api/sessions/start`

**Description:** Initialize a new WhatsApp session. After starting, you'll need to scan the QR code to connect.

**Request Body:**
```json
{
  "sessionId": "my-session-1",
  "webhook": "https://your-webhook-url.com/whatsapp" // optional
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/sessions/start \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "my-session-1",
    "webhook": "https://webhook.site/123456"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "The session is starting. Check the status to get the QR code.",
  "sessionId": "my-session-1"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Session already exists"
}
```

---

### 2. Get Session Status

**Endpoint:** `GET /api/sessions/{sessionId}/status`

**Description:** Check the current status of a WhatsApp session.

**Path Parameters:**
- `sessionId` (string): The unique session identifier

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/sessions/my-session-1/status
```

**Response (Connecting - needs QR scan):**
```json
{
  "success": true,
  "sessionId": "my-session-1",
  "status": "connecting",
  "qr": "2@abc123...def456"
}
```

**Response (Connected and ready):**
```json
{
  "success": true,
  "sessionId": "my-session-1",
  "status": "open",
  "qr": null
}
```

**Response (Session not found):**
```json
{
  "success": false,
  "error": "Session not found"
}
```

---

### 3. Send Text Message

**Endpoint:** `POST /api/sessions/{sessionId}/send-message`

**Description:** Send a text message to a WhatsApp number.

**Path Parameters:**
- `sessionId` (string): The session identifier

**Request Body:**
```json
{
  "number": "1234567890",
  "message": "Hello from Baileys Server!"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/sessions/my-session-1/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "message": "Hello from Baileys Server!"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Mensaje enviado exitosamente.",
  "details": {
    "key": {
      "remoteJid": "1234567890@s.whatsapp.net",
      "fromMe": true,
      "id": "ABC123..."
    },
    "message": {
      "extendedTextMessage": {
        "text": "Hello from Baileys Server!"
      }
    },
    "messageTimestamp": "1762333497",
    "status": "PENDING"
  }
}
```

**Response (Session not ready):**
```json
{
  "success": false,
  "error": "Session is not open or ready to send messages"
}
```

---

### 4. Send Image

**Endpoint:** `POST /api/sessions/{sessionId}/send-image`

**Description:** Send an image file with an optional caption.

**Path Parameters:**
- `sessionId` (string): The session identifier

**Request Body (multipart/form-data):**
- `number` (string): Recipient's phone number
- `caption` (string, optional): Text caption for the image
- `image` (file): Image file (JPG, PNG, etc.)

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/sessions/my-session-1/send-image \
  -F "number=1234567890" \
  -F "caption=Check out this image!" \
  -F "image=@/path/to/your/image.jpg"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Image sent successfully.",
  "details": {
    "key": {
      "remoteJid": "1234567890@s.whatsapp.net",
      "fromMe": true,
      "id": "DEF456..."
    },
    "message": {
      "imageMessage": {
        "url": "https://mmg.whatsapp.net/...",
        "mimetype": "image/jpeg",
        "caption": "Check out this image!",
        "fileSha256": "...",
        "fileLength": "12345",
        "mediaKey": "...",
        "fileEncSha256": "...",
        "directPath": "/...",
        "mediaKeyTimestamp": "1762333807"
      }
    },
    "messageTimestamp": "1762333807",
    "status": "PENDING"
  }
}
```

---

### 5. Send Document

**Endpoint:** `POST /api/sessions/{sessionId}/send-document`

**Description:** Send a document file (PDF, DOC, TXT, etc.).

**Path Parameters:**
- `sessionId` (string): The session identifier

**Request Body (multipart/form-data):**
- `number` (string): Recipient's phone number
- `document` (file): Document file

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/sessions/my-session-1/send-document \
  -F "number=1234567890" \
  -F "document=@/path/to/your/document.pdf"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Document sent successfully.",
  "details": {
    "key": {
      "remoteJid": "1234567890@s.whatsapp.net",
      "fromMe": true,
      "id": "GHI789..."
    },
    "message": {
      "documentMessage": {
        "url": "https://mmg.whatsapp.net/...",
        "mimetype": "application/pdf",
        "fileSha256": "...",
        "fileLength": "67890",
        "mediaKey": "...",
        "fileName": "document.pdf",
        "fileEncSha256": "...",
        "directPath": "/...",
        "mediaKeyTimestamp": "1762333831"
      }
    },
    "messageTimestamp": "1762333831",
    "status": "PENDING"
  }
}
```

---

### 6. Get QR Code

**Endpoint:** `GET /api/sessions/{sessionId}/qr`

**Description:** Retrieve the QR code string for a session that needs to be scanned.

**Path Parameters:**
- `sessionId` (string): The session identifier

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/sessions/my-session-1/qr
```

**Response (QR available):**
```json
{
  "success": true,
  "qr": "2@abc123...def456",
  "message": "Scan this QR code with WhatsApp"
}
```

**Response (Already connected):**
```json
{
  "success": true,
  "qr": null,
  "message": "Session is already connected"
}
```

---

### 7. Close Session

**Endpoint:** `DELETE /api/sessions/{sessionId}/end`

**Description:** Close a WhatsApp session and delete all associated data.

**Path Parameters:**
- `sessionId` (string): The session identifier to close

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/sessions/my-session-1/end
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Session closed successfully"
}
```

**Response (Session not found):**
```json
{
  "success": false,
  "error": "Session not found"
}
```

---

## Status Codes

- **200**: Success
- **400**: Bad Request (missing parameters)
- **404**: Session not found
- **503**: Session not ready (not connected)

## Session States

- **connecting**: Session is initializing, QR code available
- **open**: Session is connected and ready to send messages
- **closed**: Session has been terminated

## Message Status

- **PENDING**: Message queued for delivery
- **SENT**: Message sent to WhatsApp servers
- **DELIVERED**: Message delivered to recipient
- **READ**: Message read by recipient

## Webhook Integration

If you provided a webhook URL when starting the session, you'll receive incoming messages at that URL with this payload:

```json
{
  "sessionId": "my-session-1",
  "type": "message",
  "from": "1234567890@s.whatsapp.net",
  "body": "Incoming message text",
  "timestamp": 1762333497
}
```

## Error Handling

Always check the `success` field in responses. If `false`, check the `error` or `message` field for details.

## Rate Limiting

WhatsApp has rate limits. Avoid sending messages too frequently to prevent temporary blocks.

## File Upload Limits

- Images: Maximum 16MB
- Documents: Maximum 100MB
- Supported formats: JPG, PNG, PDF, DOC, DOCX, TXT, etc.

---

*Generated for Baileys WhatsApp Server Pro - Reference Implementation*</content>
<parameter name="filePath">/Users/zulfadliresources/Herd/baileys-server-pro/API_USAGE_EXAMPLES.md