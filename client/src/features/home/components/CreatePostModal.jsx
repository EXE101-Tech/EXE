import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { postService } from '../../../shared/services/api';
import { ImagePlus, X, XCircle, MapPin, Clock, Info } from 'lucide-react';

const CreatePostModal = ({ isOpen, onClose, onSuccess, sports = [] }) => {
  const { t } = useTranslation();
  
  const [content, setContent] = useState('');
  const [sportId, setSportId] = useState('');
  const [level, setLevel] = useState('INTERMEDIATE');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [images, setImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Append new files
    setImages(prev => [...prev, ...files]);
    
    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      const newUrls = [...prev];
      URL.revokeObjectURL(newUrls[index]);
      newUrls.splice(index, 1);
      return newUrls;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError(t('createPost.contentRequired'));
      return;
    }

    if (startTime) {
      const selectedTime = new Date(startTime).getTime();
      const now = new Date().getTime();
      if (selectedTime <= now) {
        setError(t('createPost.timeError'));
        return;
      }
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('content', content);
      
      if (sportId) formData.append('sport_id', sportId);
      if (level) formData.append('required_level', level);
      if (location) formData.append('location', location);
      if (startTime) {
        // Convert to ISO or format that backend expects. 
        // Our backend expects a valid datetime string. 
        formData.append('start_time', new Date(startTime).toISOString());
      }
      
      images.forEach(image => {
        formData.append('images', image);
      });

      await postService.create(formData);
      
      // Cleanup
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setContent('');
      setSportId('');
      setLevel('INTERMEDIATE');
      setLocation('');
      setStartTime('');
      setImages([]);
      setPreviewUrls([]);
      
      onSuccess(); // Trigger reload or close
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('createPost.title')}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-4 gap-4">
          
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-start gap-2">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Content area */}
          <div>
            <textarea
              className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none min-h-[120px]"
              placeholder={t('createPost.content')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          
          {/* Images preview */}
          {previewUrls.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative shrink-0">
                  <img src={url} alt="preview" className="w-24 h-24 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full shadow-md"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tools bar */}
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            >
              <ImagePlus size={18} />
              {t('createPost.selectImage')}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              className="hidden" 
              accept="image/*"
              multiple
            />
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createPost.sport')}</label>
              <select
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- {t('createPost.sport')} --</option>
                {/* Note: sports comes from Home.jsx. Ideally fetched from DB, but using sports for UI. */}
                {sports.map(s => (
                  <option key={s.id} value={s.id}>{t(`sports.${s.key}`, s.name)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createPost.level')}</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BEGINNER">{t('sports.beginner')}</option>
                <option value="INTERMEDIATE">{t('sports.intermediate')}</option>
                <option value="ADVANCED">{t('sports.advanced')}</option>
                <option value="PRO">{t('sports.pro')}</option>
              </select>
            </div>
          </div>

          <div>
             <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createPost.location')}</label>
             <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('createPost.location')}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
             </div>
          </div>

          <div>
             <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createPost.time')}</label>
             <div className="relative">
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
             </div>
          </div>

        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            {t('createPost.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : t('createPost.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
