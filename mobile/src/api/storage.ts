import apiClient from './client';

export interface PickedImage {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export type UploadedMedia = { url: string; type: 'image' | 'video' };

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

async function upload(endpoint: '/storage/images' | '/storage/videos', file: PickedImage, fallbackMime: string) {
  const ext = file.uri.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = file.mimeType || EXT_TO_MIME[ext] || fallbackMime;
  const name = file.fileName || `upload.${ext || 'bin'}`;

  const formData = new FormData();
  // React Native FormData accepts this {uri,name,type} shape for file fields.
  formData.append('file', { uri: file.uri, name, type: mimeType } as unknown as Blob);

  const result = await apiClient.post<{ url: string }, { url: string }>(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return result.url;
}

export const storageApi = {
  uploadImage: (image: PickedImage): Promise<string> => upload('/storage/images', image, 'image/jpeg'),

  /** Uploads a picked photo or video, choosing the matching endpoint, and reports which kind it was. */
  uploadMedia: async (media: PickedImage): Promise<UploadedMedia> => {
    const ext = media.uri.split('.').pop()?.toLowerCase() ?? '';
    const isVideo = (media.mimeType ?? EXT_TO_MIME[ext] ?? '').startsWith('video/');
    if (isVideo) return { url: await upload('/storage/videos', media, 'video/mp4'), type: 'video' };
    return { url: await upload('/storage/images', media, 'image/jpeg'), type: 'image' };
  },
};
