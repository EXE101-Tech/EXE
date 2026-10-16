const VALID_VN_PREFIXES = [
  '086', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039',
  '089', '090', '093', '070', '079', '077', '076', '078',
  '088', '091', '094', '083', '084', '085', '081', '082',
  '056', '058', '092', '059', '099',
];

/**
 * Xóa ký tự không phải số và giới hạn tối đa 10 ký tự — dùng trong onChange của input số điện thoại.
 */
export const sanitizePhone = (value) =>
  value.replace(/\D/g, '').slice(0, 10);

/**
 * Trả về chuỗi lỗi nếu không hợp lệ, hoặc null nếu hợp lệ.
 */
export const validatePhone = (phone) => {
  const clean = phone.replace(/\s/g, '');
  if (!/^\d{10}$/.test(clean)) return 'Phải có đúng 10 chữ số';
  if (!VALID_VN_PREFIXES.includes(clean.slice(0, 3))) return 'Đầu số không hợp lệ';
  return null;
};

/**
 * Trả về chuỗi lỗi nếu không hợp lệ, hoặc null nếu hợp lệ.
 */
export const validateEmail = (email) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email không hợp lệ';
  return null;
};

export const validateGmailEmail = (email) => {
  if (!/^[^\s@]+@gmail\.com$/i.test(email.trim())) return 'Vui lòng sử dụng email có đuôi @gmail.com';
  return null;
};

/**
 * Trả về chuỗi lỗi nếu không hợp lệ, hoặc null nếu hợp lệ.
 */
export const validatePassword = (password, minLength = 6) => {
  if (password.length < minLength) return `Mật khẩu tối thiểu ${minLength} ký tự`;
  return null;
};
