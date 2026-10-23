import { Text } from '@/components/ui/text';
import * as ImagePicker from 'expo-image-picker';
import { Check, Film, ImagePlus, Send, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, TextInput, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { storageApi } from '@/api/storage';
import { GradientButton } from '@/components/brand/gradient-button';
import { PopupModal } from '@/components/ui/popup-modal';
import { useCreateSocialPostMutation, useUpdateSocialPostMutation } from '@/hooks/queries/use-social';
import type { SocialPost } from '@/schemas/social';
import { showToast } from '@/stores/toast-store';
import { showAlert } from '@/stores/dialog-store';
import { useAuthStore } from '@/stores/auth-store';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

interface PostComposerModalProps {
  visible: boolean;
  onClose: () => void;
  /** When set, the composer edits this post instead of creating a new one. */
  post?: SocialPost | null;
  onSaved?: () => void;
}

interface PickedMedia {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  type: 'image' | 'video';
}

export function PostComposerModal({ visible, onClose, post, onSaved }: PostComposerModalProps) {
  return (
    <PopupModal
      visible={visible}
      onClose={onClose}
      title={post ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}
      subtitle="Chia sẻ điều bạn đang nghĩ cùng cộng đồng SportGo."
      scroll={false}
    >
      {/* Mounted only while visible, so each opening starts from the post being edited (or blank). */}
      {visible ? <ComposerBody post={post ?? null} onClose={onClose} onSaved={onSaved} /> : null}
    </PopupModal>
  );
}

function ComposerBody({ post, onClose, onSaved }: { post: SocialPost | null; onClose: () => void; onSaved?: () => void }) {
  const create = useCreateSocialPostMutation();
  const update = useUpdateSocialPostMutation();
  const acceptTerms = useAuthStore((state) => state.acceptTerms);
  const guidelinesAccepted = useAuthStore((state) => Boolean(state.user?.community_guidelines_accepted));

  const [content, setContent] = useState(post?.content ?? '');
  const [existingMedia, setExistingMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(
    post?.media_url && post.media_type ? { url: post.media_url, type: post.media_type } : null,
  );
  const [pickedMedia, setPickedMedia] = useState<PickedMedia | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(guidelinesAccepted);

  const chooseMedia = async (kind: 'images' | 'videos') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Cần quyền truy cập', 'Hãy cấp quyền thư viện để chọn ảnh hoặc video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [kind], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const isVideo = asset.type === 'video' || (asset.mimeType ?? '').startsWith('video/');

    if (isVideo && !/mp4|webm/i.test(`${asset.mimeType ?? ''} ${asset.uri}`)) {
      setError('Video chỉ hỗ trợ định dạng MP4 hoặc WebM.');
      return;
    }
    if (asset.fileSize && asset.fileSize > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
      setError(isVideo ? 'Video tối đa 50 MB.' : 'Ảnh tối đa 8 MB.');
      return;
    }
    setError('');
    setExistingMedia(null);
    setPickedMedia({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType, type: isVideo ? 'video' : 'image' });
  };

  const removeMedia = () => {
    setPickedMedia(null);
    setExistingMedia(null);
  };

  const submit = async () => {
    const text = content.trim();
    if (!text && !pickedMedia && !existingMedia) {
      setError('Hãy nhập nội dung hoặc chọn ảnh/video để đăng.');
      return;
    }
    if (!post && !acceptedGuidelines) {
      setError('Vui lòng xác nhận bạn đã đọc và đồng ý quy tắc cộng đồng trước khi đăng.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      if (!post && !guidelinesAccepted) await acceptTerms();
      let mediaUrl: string | null = existingMedia?.url ?? null;
      let mediaType: 'image' | 'video' | null = existingMedia?.type ?? null;
      if (pickedMedia) {
        const uploaded = await storageApi.uploadMedia(pickedMedia);
        mediaUrl = uploaded.url;
        mediaType = uploaded.type;
      }
      const data = { content: text || null, media_url: mediaUrl, media_type: mediaType };
      if (post) await update.mutateAsync({ id: post.id, data });
      else await create.mutateAsync(data);
      onSaved?.();
      onClose();
      showToast(post ? 'Đã cập nhật bài viết.' : 'Bài viết đã được chia sẻ.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu bài viết.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasMedia = Boolean(pickedMedia || existingMedia);

  return (
    <>
      <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
        {error ? (
          <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
            <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</Text>
          </View>
        ) : null}

        <TextInput
          value={content}
          onChangeText={setContent}
          maxLength={5000}
          multiline
          textAlignVertical="top"
          placeholder="Bạn đang nghĩ gì?"
          placeholderTextColor="#94A3B8"
          className="min-h-[140px] rounded-2xl border border-border bg-slate-50 p-4 text-sm leading-6 text-slate-900 dark:border-border-dark dark:bg-[#0d1424] dark:text-white"
        />

        {hasMedia ? (
          // A small square thumbnail keeps the popup compact whatever the size or ratio of the picked file.
          <View className="flex-row items-center gap-3">
            <View className="h-24 w-24">
              <View className="h-full w-full overflow-hidden rounded-2xl border border-border bg-slate-100 dark:border-border-dark dark:bg-slate-800">
                {pickedMedia?.type === 'image' || existingMedia?.type === 'image' ? (
                  <Image
                    source={{ uri: pickedMedia ? pickedMedia.uri : resolveMediaUrl(existingMedia?.url) }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center gap-1">
                    <Film size={26} color="#6366F1" />
                    <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Video</Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={removeMedia}
                accessibilityLabel="Gỡ tệp"
                hitSlop={8}
                className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-700"
              >
                <X size={13} color="#fff" />
              </Pressable>
            </View>
            <Text className="flex-1 text-xs text-slate-500 dark:text-slate-400" numberOfLines={2}>
              {pickedMedia?.fileName || (existingMedia?.type === 'video' ? 'Video đã đăng kèm' : 'Ảnh đã chọn')}
            </Text>
          </View>
        ) : null}

        <View className="flex-row flex-wrap items-center gap-2 border-t border-border pt-3 dark:border-border-dark">
          <Pressable
            onPress={() => chooseMedia('images')}
            disabled={isSaving}
            className="flex-row items-center gap-2 rounded-xl px-3 py-2 active:bg-slate-100 dark:active:bg-white/10"
          >
            <ImagePlus size={16} color="#059669" />
            <Text className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Ảnh</Text>
          </Pressable>
          <Pressable
            onPress={() => chooseMedia('videos')}
            disabled={isSaving}
            className="flex-row items-center gap-2 rounded-xl px-3 py-2 active:bg-slate-100 dark:active:bg-white/10"
          >
            <Film size={16} color="#4F46E5" />
            <Text className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Video</Text>
          </Pressable>
          <Text className="ml-auto text-[11px] text-slate-400">Ảnh ≤ 8 MB · Video ≤ 50 MB</Text>
        </View>
        {!post && !guidelinesAccepted ? (
          <Pressable onPress={() => setAcceptedGuidelines((value) => !value)} className="flex-row items-start gap-2">
            <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-md border border-border dark:border-border-dark" style={{ backgroundColor: acceptedGuidelines ? '#537fff' : 'transparent' }}>
              {acceptedGuidelines ? <Check size={14} color="#fff" /> : null}
            </View>
            <Text className="flex-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Tôi đồng ý tuân thủ quy tắc cộng đồng SportGo.</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View className="flex-row items-center justify-end border-t border-border bg-bg px-4 py-3 dark:border-border-dark dark:bg-bg-dark">
        <GradientButton
          label={isSaving ? 'Đang lưu…' : post ? 'Lưu bài viết' : 'Đăng bài'}
          icon={isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Send size={15} color="#fff" />}
          disabled={isSaving}
          onPress={submit}
          className="min-w-[160px]"
        />
      </View>
    </>
  );
}
