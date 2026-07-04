import React, { useState, useEffect } from 'react';
import { X, Save, Activity } from 'lucide-react';

const LEVEL_OPTIONS = [
  { label: 'Mới chơi', percentage: 25 },
  { label: 'Cơ bản', percentage: 40 },
  { label: 'Trung bình', percentage: 50 },
  { label: 'Trung bình khá', percentage: 65 },
  { label: 'Khá', percentage: 75 },
  { label: 'Giỏi', percentage: 90 },
  { label: 'Chuyên nghiệp', percentage: 100 },
];

export default function EditSkillModal({ isOpen, onClose, skills, onSave }) {
  const [editedSkills, setEditedSkills] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setEditedSkills(JSON.parse(JSON.stringify(skills)));
    }
  }, [isOpen, skills]);

  if (!isOpen) return null;

  const handleLevelChange = (index, newLevelLabel) => {
    const selectedOption = LEVEL_OPTIONS.find(opt => opt.label === newLevelLabel);
    if (!selectedOption) return;

    const newSkills = [...editedSkills];
    newSkills[index] = {
      ...newSkills[index],
      level: selectedOption.label,
      percentage: selectedOption.percentage
    };
    setEditedSkills(newSkills);
  };

  const handleSave = () => {
    onSave(editedSkills);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Chỉnh sửa trình độ</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cập nhật năng lực thể thao của bạn</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - 2 column layout: sport name left, dropdown right */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-3">
            {editedSkills.map((skill, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-28 shrink-0">
                  {skill.sport}
                </span>
                <select
                  value={skill.level}
                  onChange={(e) => handleLevelChange(idx, e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
