# Document Upload API Examples

## Authentication

All requests require a valid JWT token in the Authorization header:

```
Authorization: Bearer <session_token>
```

## Upload Document (Base64)

### Request

```bash
curl -X POST \
  'https://api.authbridge.bw/api/v1/verifications/ver_abc123/documents' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "documentType": "omang_front",
    "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
    "metadata": {
      "captureMethod": "camera",
      "deviceType": "mobile",
      "timestamp": "2026-01-14T11:00:00Z"
    }
  }'
```

### Success Response (201 Created)

```json
{
  "documentId": "doc_abc123def456",
  "verificationId": "ver_abc123",
  "documentType": "omang_front",
  "s3Key": "client_xyz/ver_abc123/omang_front-1705230000000.jpg",
  "fileSize": 1048576,
  "mimeType": "image/jpeg",
  "uploadedAt": "2026-01-14T11:00:00Z",
  "status": "uploaded",
  "presignedUrl": "https://authbridge-documents-prod.s3.af-south-1.amazonaws.com/client_xyz/ver_abc123/omang_front-1705230000000.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "presignedUrlExpiresAt": "2026-01-14T11:15:00Z",
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-14T11:00:00Z"
  }
}
```

## Document Types

| Type | Description |
|------|-------------|
| `omang_front` | Omang card front side |
| `omang_back` | Omang card back side |
| `selfie` | Selfie with liveness detection |
| `passport` | Passport photo page |
| `drivers_license_front` | Driver's license front |
| `drivers_license_back` | Driver's license back |
| `id_card_front` | ID card front |
| `id_card_back` | ID card back |

## Upload Omang Front

```bash
curl -X POST \
  'https://api.authbridge.bw/api/v1/verifications/ver_abc123/documents' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "documentType": "omang_front",
    "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

## Upload Omang Back

```bash
curl -X POST \
  'https://api.authbridge.bw/api/v1/verifications/ver_abc123/documents' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "documentType": "omang_back",
    "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

## Upload Selfie

```bash
curl -X POST \
  'https://api.authbridge.bw/api/v1/verifications/ver_abc123/documents' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "documentType": "selfie",
    "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "metadata": {
      "captureMethod": "camera",
      "deviceType": "mobile"
    }
  }'
```

## Upload PDF Document

```bash
curl -X POST \
  'https://api.authbridge.bw/api/v1/verifications/ver_abc123/documents' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "documentType": "passport",
    "imageData": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9..."
  }'
```

## Refresh Presigned URL

When a presigned URL expires (after 15 minutes), request a new one:

```bash
curl -X POST \
  'https://api.authbridge.bw/api/v1/verifications/ver_abc123/documents/doc_xyz789/url' \
  -H 'Authorization: Bearer <token>'
```

### Response

```json
{
  "documentId": "doc_xyz789",
  "presignedUrl": "https://authbridge-documents-prod.s3.af-south-1.amazonaws.com/...",
  "presignedUrlExpiresAt": "2026-01-14T12:30:00Z",
  "meta": {
    "requestId": "req_def456",
    "timestamp": "2026-01-14T12:15:00Z"
  }
}
```

## Error Responses

### File Too Large (413)

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum allowed size of 10MB",
    "details": [
      {
        "field": "imageData",
        "message": "File size: 12.5MB, Maximum: 10MB"
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-14T11:00:00Z"
  }
}
```

### Invalid File Type (400)

```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "File type not supported",
    "details": [
      {
        "field": "mimeType",
        "message": "Supported types: image/jpeg, image/png, application/pdf"
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-14T11:00:00Z"
  }
}
```

### Image Too Small (400)

```json
{
  "error": {
    "code": "IMAGE_TOO_SMALL",
    "message": "Image dimensions do not meet minimum requirements",
    "details": [
      {
        "field": "imageData",
        "message": "Image dimensions: 320x240, Minimum: 640x480"
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-14T11:00:00Z"
  }
}
```

### Verification Not Found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Verification not found"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-14T11:00:00Z"
  }
}
```

### Document Limit Exceeded (400)

```json
{
  "error": {
    "code": "DOCUMENT_LIMIT_EXCEEDED",
    "message": "Maximum 20 documents allowed per verification"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-14T11:00:00Z"
  }
}
```

### Invalid State (400)

```json
{
  "error": {
    "code": "INVALID_STATE",
    "message": "Cannot upload documents when verification is in 'submitted' status"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-14T11:00:00Z"
  }
}
```

## JavaScript/TypeScript Example

```typescript
async function uploadDocument(
  verificationId: string,
  documentType: string,
  imageData: string,
  sessionToken: string
): Promise<DocumentResponse> {
  const response = await fetch(
    `https://api.authbridge.bw/api/v1/verifications/${verificationId}/documents`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentType,
        imageData,
        metadata: {
          captureMethod: 'camera',
          deviceType: 'mobile',
          timestamp: new Date().toISOString(),
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}

// Usage
const result = await uploadDocument(
  'ver_abc123',
  'omang_front',
  'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'
);

console.log('Document uploaded:', result.documentId);
console.log('Access URL:', result.presignedUrl);
```

## Python Example

```python
import requests
import base64

def upload_document(verification_id: str, document_type: str, image_path: str, token: str):
    # Read and encode image
    with open(image_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')

    # Determine mime type
    mime_type = 'image/jpeg' if image_path.endswith('.jpg') else 'image/png'
    data_uri = f'data:{mime_type};base64,{image_data}'

    response = requests.post(
        f'https://api.authbridge.bw/api/v1/verifications/{verification_id}/documents',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        },
        json={
            'documentType': document_type,
            'imageData': data_uri,
        }
    )

    response.raise_for_status()
    return response.json()

# Usage
result = upload_document(
    'ver_abc123',
    'omang_front',
    '/path/to/omang_front.jpg',
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'
)

print(f"Document uploaded: {result['documentId']}")
print(f"Access URL: {result['presignedUrl']}")
```
