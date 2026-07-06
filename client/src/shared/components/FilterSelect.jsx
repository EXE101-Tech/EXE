import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * FilterSelect: Component dropdown tự động co giãn chiều ngang (width) 
 * khít theo chiều dài của chữ (option) đang được chọn hiện tại.
 */
export default function FilterSelect({
  icon: Icon,
  iconColor = 'text-amber-500',
  value,
  onChange,
  options = [],
  children,
  className = '',
  selectClassName = '',
}) {
  // Tìm label hiển thị từ children (các thẻ <option>) hoặc từ mảng options
  let displayLabel = 'Tất cả';
  if (children) {
    const childrenArray = React.Children.toArray(children);
    const selectedChild = childrenArray.find(
      (child) =>
        child.props?.value === value ||
        (value === null && child.props?.value === 'all') ||
        String(child.props?.value) === String(value)
    );
    if (selectedChild && selectedChild.props?.children) {
      displayLabel = selectedChild.props.children;
    } else if (childrenArray.length > 0 && childrenArray[0].props?.children) {
      displayLabel = childrenArray[0].props.children;
    }
  } else if (options && options.length > 0) {
    const found = options.find((opt) => opt.value === value);
    if (found) displayLabel = found.label;
    else displayLabel = options[0].label;
  }

  return (
    <div className={`relative shrink-0 inline-grid items-center ${className}`}>
      {/* 1. Icon bên trái */}
      {Icon && (
        <Icon
          className={`w-4 h-4 ${iconColor} absolute left-3.5 z-10 pointer-events-none`}
        />
      )}

      {/* 2. Span ẩn (invisible) ở vị trí grid (col-start-1 row-start-1).
          Span này sẽ tự động đo và quyết định chiều ngang vừa khít với chữ đang chọn + padding. */}
      <span className="invisible whitespace-nowrap pl-9 pr-7 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold pointer-events-none col-start-1 row-start-1 select-none">
        {displayLabel}
      </span>

      {/* 3. Thẻ select phủ 100% diện tích grid cell (w-full h-full min-w-0), bỏ qua độ rộng cố định từ option dài nhất */}
      <select
        value={value}
        onChange={onChange}
        className={`w-full h-full min-w-0 col-start-1 row-start-1 bg-white dark:bg-[#001F3F]/80 border border-slate-200 dark:border-white/15 rounded-2xl pl-9 pr-7 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-[#589470] dark:focus:border-[#74C365] shadow-sm appearance-none cursor-pointer hover:border-slate-300 transition-all ${selectClassName}`}
      >
        {children ||
          options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
      </select>

      {/* 4. Mũi tên dropdown bên phải */}
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
    </div>
  );
}
