/**
 * Verification API Service
 * Handles submission of verification data to backend
 */

export interface SubmitVerificationRequest {
  documentFront: string;  // base64 or blob URL
  documentBack?: string | null;
  selfie: string;
  documentType: string;
  sessionId: string;
}

export interface SubmitVerificationResponse {
  verificationId: string;
  referenceNumber: string;
  status: string;
}

/**
 * Submit verification to backend
 * TODO: Replace mock implementation with real API calls in Epic 4
 *
 * Real implementation will:
 * 1. Get presigned URLs from backend
 * 2. Upload images to S3
 * 3. Create verification case in DynamoDB
 * 4. Return verification ID and reference number
 */
export async function submitVerification(
  request: SubmitVerificationRequest
): Promise<SubmitVerificationResponse> {
  // Get backend config from window context
  const backendUrl = (window as any).__blrn_api_url || 'http://localhost:3001';
  const clientId = (window as any).__blrn_context?.backendConfig?.auth?.clientId;
  const useMockApi = (window as any).__blrn_use_mock_api !== false &&
                     (!backendUrl || backendUrl === 'http://localhost:3001');

  // For MVP: Mock successful submission
  // In Epic 4, this will be replaced with real API calls
  if (useMockApi) {
    console.log('[MVP Mock] Simulating verification submission...', {
      documentType: request.documentType,
      hasDocumentFront: !!request.documentFront,
      hasDocumentBack: !!request.documentBack,
      hasSelfie: !!request.selfie,
      sessionId: request.sessionId,
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return mock response
    return {
      verificationId: 'ver_' + Date.now(),
      referenceNumber: 'REF-2026-' + String(Date.now()).slice(-6),
      status: 'pending',
    };
  }

  // Real implementation (Epic 4)
  try {
    // Step 1: Request presigned URLs for image upload
    const presignedResponse = await fetch(`${backendUrl}/api/v1/verifications/presigned-urls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId || '',
        'X-Session-ID': request.sessionId,
      },
      body: JSON.stringify({
        documentType: request.documentType,
        hasBackSide: !!request.documentBack,
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error(`Failed to get presigned URLs: ${presignedResponse.statusText}`);
    }

    const { urls } = await presignedResponse.json();

    // Step 2: Upload images to S3 using presigned URLs
    const uploadPromises = [];

    if (request.documentFront) {
      uploadPromises.push(uploadImageToS3(urls.documentFront, request.documentFront));
    }

    if (request.documentBack) {
      uploadPromises.push(uploadImageToS3(urls.documentBack, request.documentBack));
    }

    if (request.selfie) {
      uploadPromises.push(uploadImageToS3(urls.selfie, request.selfie));
    }

    await Promise.all(uploadPromises);

    // Step 3: Create verification case
    const verificationResponse = await fetch(`${backendUrl}/api/v1/verifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId || '',
        'X-Session-ID': request.sessionId,
      },
      body: JSON.stringify({
        documentType: request.documentType,
        documents: {
          front: urls.documentFront.split('?')[0], // S3 URL without query params
          back: request.documentBack ? urls.documentBack.split('?')[0] : null,
        },
        selfie: urls.selfie.split('?')[0],
      }),
    });

    if (!verificationResponse.ok) {
      throw new Error(`Verification creation failed: ${verificationResponse.statusText}`);
    }

    return verificationResponse.json();
  } catch (error) {
    console.error('Verification submission failed:', error);
    throw error;
  }
}

/**
 * Upload image to S3 using presigned URL
 */
async function uploadImageToS3(presignedUrl: string, imageData: string): Promise<void> {
  // Convert base64 to blob if needed
  let blob: Blob;

  if (imageData.startsWith('data:')) {
    // Base64 data URL
    const base64Data = imageData.split(',')[1];
    const mimeType = imageData.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    blob = new Blob([bytes], { type: mimeType });
  } else if (imageData.startsWith('blob:')) {
    // Blob URL
    const response = await fetch(imageData);
    blob = await response.blob();
  } else {
    throw new Error('Unsupported image data format');
  }

  // Upload to S3
  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': blob.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
  }
}
