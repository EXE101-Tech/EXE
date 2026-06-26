import { ArrowRight } from 'lucide-react';

function BookingBar({ selectedCount, totalPrice, onBook }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 pt-3 pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] z-50">
      {/* Thông tin tổng tiền và số buổi */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Total Payment</p>
          <p className="text-2xl font-bold text-blue-600">
            {selectedCount > 0 ? `${(totalPrice / 1000).toLocaleString()}k` : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 dark:text-gray-500">Selected Slots</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {selectedCount > 0 ? `${selectedCount} Sessions` : '—'}
          </p>
        </div>
      </div>

      {/* Nút đặt sân */}
      <button
        onClick={onBook}
        disabled={selectedCount === 0}
        className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
          selectedCount > 0
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
        }`}
      >
        Book Now
        {selectedCount > 0 && <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default BookingBar;
