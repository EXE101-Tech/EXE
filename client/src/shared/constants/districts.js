// Areas used for matching automatic game-room invitations.
export const ACTIVITY_DISTRICTS = [
  'Quận 1',
  'Quận 2',
  'Quận 3',
  'Quận 4',
  'Quận 5',
  'Quận 6',
  'Quận 7',
  'Quận 8',
  'Quận 9',
  'Quận 10',
  'Quận 11',
  'Quận 12',
  'Quận Bình Thạnh',
  'Quận Tân Bình',
  'Quận Tân Phú',
  'Quận Phú Nhuận',
  'Quận Gò Vấp',
  'Quận Bình Tân',
  'Quận Thủ Đức',
  'TP. Thủ Đức',
  'Huyện Bình Chánh',
  'Huyện Hóc Môn',
  'Huyện Củ Chi',
  'Huyện Nhà Bè',
  'Huyện Cần Giờ',
];

// Full location filter shared by rooms, posts and court listings.
// Keep the value "Thủ Đức" so it continues matching older room/address data.
export const LOCATION_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả khu vực' },
  ...ACTIVITY_DISTRICTS
    .filter((district) => district !== 'Quận Thủ Đức')
    .map((district) => ({
      value: district === 'TP. Thủ Đức' ? 'Thủ Đức' : district,
      label: district,
    })),
];
