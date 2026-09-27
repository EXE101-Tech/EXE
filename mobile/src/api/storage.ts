import apiClient from './client';

export interface PickedImage {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

export const storageApi = {
  uploadImage: async (image: PickedImage): Promise<string> => {
    const ext = image.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType = image.mimeType || EXT_TO_MIME[ext] || 'image/jpeg';
    const name = image.fileName || `upload.${ext}`;

    const formData = new FormData();
    // React Native's FormData accepts this {uri,name,type} shape for file fields.
    formData.append('file', { uri: image.uri, name, type: mimeType } as unknown as Blob);

    const result = await apiClient.post<{ url: string }, { url: string }>('/storage/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return result.url;
  },
};
