import React from 'react';
import { CheckCircle2, Calendar, Clock, MapPin, DollarSign, MessageSquare, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../../shared/context/ChatContext';

export default function BookingSuccessModal({ isOpen, onClose, bookingData }) {
  const navigate = useNavigate();
  const { openChat } = useChat();

  if (!isOpen || !bookingData) return null;

  const handleGoToBookings = () => {
    onClose();
    navigate('/home');
  };

  const handleOpenHostChat = () => {
    onClose();
    openChat(bookingData.hostName || 'Chủ sân');
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-[#001F3F] border border-gray-200 dark:border-white/15 rounded-3xl shadow-2xl p-6 sm:p-8 text-center animate-in zoom-in-95 duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Aura */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-gradient-to-br from-[#74C365]/30 to-[#589470]/0 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-gradient-to-br from-blue-500/20 to-indigo-500/0 rounded-full blur-3xl pointer-events-none" />

        {/* Celebratory Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#74C365] to-[#589470] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-[#589470]/30 animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-white stroke-[2.5]" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#589470]/15 dark:bg-[#74C365]/20 text-[#589470] dark:text-[#74C365] text-xs font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Đặt Sân Thành Công</span>
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
          Hóa Đơn Xác Nhận Sân
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Chủ sân đã nhận được yêu cầu và giữ sân cho bạn!
        </p>

        {/* Invoice Summary Box */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-left space-y-3 mb-6">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
            <span className="text-xs text-slate-400 font-medium">Khu Sân / CLB:</span>
            <span className="text-sm font-black text-slate-900 dark:text-white text-right max-w-[200px] truncate">
              {bookingData.venueName || 'Sân Cầu Lông Proton'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 font-medium">Khung Giờ (30p):</span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {bookingData.selectedCount || 2} ô ({((bookingData.selectedCount || 2) * 0.5).toFixed(1)} giờ)
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
            <span className="text-xs text-slate-400 font-medium">Tổng Thanh Toán:</span>
            <span className="text-xl font-black bg-gradient-to-r from-[#74C365] to-[#589470] bg-clip-text text-transparent">
              {(bookingData.totalPrice || 100000).toLocaleString()}đ
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleOpenHostChat}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Nhắn tin với Chủ Sân ({bookingData.hostName || 'Host'})</span>
          </button>

          <button
            type="button"
            onClick={handleGoToBookings}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span>Trở về Trang Chủ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
