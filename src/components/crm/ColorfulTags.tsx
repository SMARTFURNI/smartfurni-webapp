'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface ColorfulTagsProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  editable?: boolean;
}

const TAG_COLORS = [
  { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
];

export default function ColorfulTags({
  tags,
  onTagsChange,
  editable = true,
}: ColorfulTagsProps) {
  const [newTag, setNewTag] = useState('');
  const [showInput, setShowInput] = useState(false);

  const getColorForTag = (index: number) => {
    return TAG_COLORS[index % TAG_COLORS.length];
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()]);
      setNewTag('');
      setShowInput(false);
    }
  };

  const handleRemoveTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((tag, index) => {
        const color = getColorForTag(index);
        return (
          <div
            key={index}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${color.bg} ${color.text} ${color.border} border-2 transition-all duration-200 hover:shadow-md`}
          >
            <span className="text-sm font-medium">{tag}</span>
            {editable && (
              <button
                onClick={() => handleRemoveTag(index)}
                className="hover:bg-white/30 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      {editable && (
        <>
          {showInput ? (
            <div className="flex gap-1 items-center">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTag();
                  }
                }}
                placeholder="Thêm tag..."
                className="px-2 py-1 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none text-sm"
                autoFocus
              />
              <button
                onClick={handleAddTag}
                className="px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Thêm
              </button>
              <button
                onClick={() => {
                  setShowInput(false);
                  setNewTag('');
                }}
                className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Hủy
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Thêm Tag</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
