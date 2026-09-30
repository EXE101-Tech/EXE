import { useEffect, useState } from 'react';
import { Check, Clipboard, Crown, LoaderCircle, Upload, X } from 'lucide-react';
import qrCodeImage from '../../../qrcode/5ca5ce791612964ccf03.jpg';
import { premiumService, storageService } from '../../shared/services/api';

export default function PremiumInfoModal({ isOpen, onClose }) {
  const [intent, setIntent] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    setError('');
    setSuccess(false);
    setProofFile(null);
    setProofUrl('');
    setIntent(null);
    premiumService.createPaymentIntent()
      .then((value) => { if (active) setIntent(value); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Không tạo được mã thanh toán.'); });
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const copyCode = async () => {
    if (!intent?.payment_code) return;
    try {
      await navigator.clipboard.writeText(intent.payment_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Không thể sao chép mã. Hãy bôi đen và sao chép thủ công.');
    }
  };

  const chooseProof = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setError('');
    setUploading(true);
    try {
      const url = await storageService.uploadImage(file);
      setProofUrl(url);
    } catch (uploadError) {
      setProofFile(null);
      setError(uploadError.message || 'Không tải được ảnh chuyển khoản.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!intent || !proofUrl || loading) return;
    setLoading(true);
    setError('');
    try {
      await premiumService.submitPaymentProof(intent.id, { payment_code: intent.payment_code, proof_url: proofUrl });
      setSuccess(true);
    } catch (submitError) {
      setError(submitError.message || 'Không gửi được giao dịch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="premium-payment-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#101827]">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><Crown className="h-6 w-6" /></span>
            <div><h2 id="premium-payment-title" className="text-xl font-black text-slate-900 dark:text-white">Nâng cấp SportGo Premium</h2><p className="text-sm text-slate-500 dark:text-slate-400">30.000đ / tháng</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-400/20 dark:bg-emerald-400/10"><Check className="mx-auto h-9 w-9 text-emerald-600 dark:text-emerald-300" /><h3 className="mt-2 font-extrabold text-emerald-800 dark:text-emerald-200">Đã gửi ảnh chuyển khoản</h3><p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">Quản trị viên sẽ kiểm tra và kích hoạt gói trong thời gian sớm nhất.</p><button type="button" onClick={onClose} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Đóng</button></div> : <form onSubmit={submit} className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-white/5"><p className="font-bold text-slate-800 dark:text-white">1. Quét mã QR để chuyển đúng 30.000đ</p><img src={qrCodeImage} alt="Mã QR nhận thanh toán SportGo Premium" className="mx-auto mt-3 h-56 w-56 rounded-xl object-contain" /><p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Ghi đúng mã giao dịch bên dưới vào nội dung chuyển khoản.</p></div>
          <div><label htmlFor="premium-payment-code" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Mã giao dịch</label><div className="flex gap-2"><input id="premium-payment-code" readOnly value={intent?.payment_code || 'Đang tạo mã...'} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm font-bold text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-white" /><button type="button" onClick={copyCode} disabled={!intent} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200">{copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Clipboard className="h-4 w-4" />} {copied ? 'Đã sao chép' : 'Sao chép'}</button></div></div>
          <div><label htmlFor="premium-proof" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ảnh chụp giao dịch</label><label htmlFor="premium-proof" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm font-semibold text-slate-600 hover:border-emerald-500 dark:border-white/20 dark:text-slate-300"><Upload className="h-5 w-5" />{uploading ? 'Đang tải ảnh...' : proofFile ? proofFile.name : 'Chọn ảnh chuyển khoản'}<input id="premium-proof" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={chooseProof} disabled={uploading} /></label></div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{error}</p>}
          <button type="submit" disabled={!intent || !proofUrl || uploading || loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{loading && <LoaderCircle className="h-4 w-4 animate-spin" />} Xác nhận đã chuyển khoản</button>
        </form>}
      </section>
    </div>
  );
}
