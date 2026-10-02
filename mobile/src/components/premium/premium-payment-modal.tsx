import { Text } from '@/components/ui/text';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Check, Clipboard as ClipboardIcon, Crown, Upload, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { storageApi } from '@/api/storage';
import { AppDialog } from '@/components/ui/app-dialog';
import { useCreatePaymentIntentMutation, useSubmitPaymentProofMutation } from '@/hooks/queries/use-premium';
import type { PremiumPaymentIntent } from '@/schemas/premium';
import { showAlert } from '@/stores/dialog-store';

const QR_IMAGE = require('../../../assets/images/premium-qr.jpg');

interface PremiumPaymentModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PremiumPaymentModal({ visible, onClose }: PremiumPaymentModalProps) {
  const createIntent = useCreatePaymentIntentMutation();
  const submitProof = useSubmitPaymentProofMutation();

  const [intent, setIntent] = useState<PremiumPaymentIntent | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [proofName, setProofName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const requestedRef = useRef(false);

  // A fresh transfer code is requested each time the modal opens (the server reuses an unsent one).
  useEffect(() => {
    if (!visible) {
      requestedRef.current = false;
      return;
    }
    if (requestedRef.current) return;
    requestedRef.current = true;
    setError('');
    setSuccess(false);
    setProofUrl('');
    setProofName('');
    setIntent(null);
    createIntent
      .mutateAsync()
      .then(setIntent)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Không tạo được mã thanh toán.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const copyCode = async () => {
    if (!intent?.payment_code) return;
    await Clipboard.setStringAsync(intent.payment_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const chooseProof = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Cần quyền truy cập', 'Hãy cấp quyền thư viện ảnh để chọn ảnh chuyển khoản.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setError('');
    setUploading(true);
    try {
      const url = await storageApi.uploadImage({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
      setProofUrl(url);
      setProofName(asset.fileName || 'Ảnh chuyển khoản');
    } catch (uploadError) {
      setProofUrl('');
      setProofName('');
      setError(uploadError instanceof Error ? uploadError.message : 'Không tải được ảnh chuyển khoản.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!intent || !proofUrl || submitProof.isPending) return;
    setError('');
    try {
      await submitProof.mutateAsync({ id: intent.id, data: { payment_code: intent.payment_code, proof_url: proofUrl } });
      setSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không gửi được giao dịch.');
    }
  };

  const canSubmit = Boolean(intent && proofUrl && !uploading && !submitProof.isPending);

  return (
    // A centered popup over a dimmed backdrop (like the web dialog), not a full page.
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-4 py-6">
        <Pressable
          accessibilityLabel="Đóng"
          onPress={onClose}
          className="absolute inset-0 bg-slate-950/75"
        />

        <View className="max-h-full w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101827]">
          <ScrollView contentContainerClassName="gap-4 p-6" keyboardShouldPersistTaps="handled" bounces={false}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 flex-row items-center gap-3">
                <View className="rounded-2xl bg-amber-100 p-3 dark:bg-amber-500/15">
                  <Crown size={24} color="#B45309" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-black text-slate-900 dark:text-white">Nâng cấp SportGo Premium</Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400">30.000đ / tháng</Text>
                </View>
              </View>
              <Pressable onPress={onClose} accessibilityLabel="Đóng" hitSlop={8} className="rounded-xl p-2">
                <X size={20} color="#64748B" />
              </Pressable>
            </View>

            {success ? (
              <View className="items-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/20 dark:bg-emerald-400/10">
                <Check size={36} color="#059669" />
                <Text className="mt-1 text-base font-extrabold text-emerald-800 dark:text-emerald-200">
                  Đã gửi ảnh chuyển khoản
                </Text>
                <Text className="text-center text-sm text-emerald-700 dark:text-emerald-300">
                  Quản trị viên sẽ kiểm tra và kích hoạt gói trong thời gian sớm nhất.
                </Text>
                <Pressable onPress={onClose} className="mt-3 rounded-xl bg-emerald-600 px-5 py-2.5">
                  <Text className="text-sm font-bold text-white">Đóng</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                  <Text className="text-sm font-bold text-slate-800 dark:text-white">
                    1. Quét mã QR để chuyển đúng 30.000đ
                  </Text>
                  <Image
                    source={QR_IMAGE}
                    style={{ width: 224, height: 224, alignSelf: 'center', marginTop: 12, borderRadius: 12 }}
                    resizeMode="contain"
                  />
                  <Text className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                    Ghi đúng mã giao dịch bên dưới vào nội dung chuyển khoản.
                  </Text>
                </View>

                <View>
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Mã giao dịch
                  </Text>
                  <View className="flex-row gap-2">
                    <View className="h-12 flex-1 justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-white/10 dark:bg-white/5">
                      <Text selectable className="font-mono text-sm font-bold text-slate-800 dark:text-white">
                        {intent?.payment_code || 'Đang tạo mã...'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={copyCode}
                      disabled={!intent}
                      className="h-12 flex-row items-center gap-1 rounded-xl border border-slate-200 px-3 dark:border-white/10"
                      style={{ opacity: intent ? 1 : 0.5 }}
                    >
                      {copied ? <Check size={16} color="#10B981" /> : <ClipboardIcon size={16} color="#64748B" />}
                      <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {copied ? 'Đã sao chép' : 'Sao chép'}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View>
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Ảnh chụp giao dịch
                  </Text>
                  <Pressable
                    onPress={chooseProof}
                    disabled={uploading}
                    className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-4 dark:border-white/20"
                  >
                    {uploading ? <ActivityIndicator size="small" color="#537fff" /> : <Upload size={18} color="#64748B" />}
                    <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300" numberOfLines={1}>
                      {uploading ? 'Đang tải ảnh...' : proofName || 'Chọn ảnh chuyển khoản'}
                    </Text>
                  </Pressable>
                  {proofUrl ? (
                    <Image
                      source={{ uri: resolveMediaUrl(proofUrl) }}
                      style={{ width: '100%', height: 160, marginTop: 10, borderRadius: 12 }}
                      resizeMode="contain"
                    />
                  ) : null}
                </View>

                {error ? (
                  <View className="rounded-xl bg-rose-50 px-3 py-2 dark:bg-rose-400/10">
                    <Text className="text-sm text-rose-700 dark:text-rose-300">{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={submit}
                  disabled={!canSubmit}
                  className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600"
                  style={{ opacity: canSubmit ? 1 : 0.5 }}
                >
                  {submitProof.isPending ? <ActivityIndicator size="small" color="#fff" /> : null}
                  <Text className="text-sm font-bold text-white">Xác nhận đã chuyển khoản</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
        <AppDialog />
      </View>
    </Modal>
  );
}
