'use client';

import React, { useState } from 'react';
import { MessageCircle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Lead } from '@/lib/types';

interface ZaloAddFriendButtonProps {
  lead: Lead;
  zaloOAId?: string;
  onSuccess?: (leadId: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function ZaloAddFriendButton({
  lead,
  zaloOAId,
  onSuccess,
  onError,
  className = '',
}: ZaloAddFriendButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleAddFriend = async () => {
    if (!lead.phone) {
      setStatus('error');
      setMessage('Không có số điện thoại');
      onError?.('Không có số điện thoại');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      // Call API to handle Zalo add friend
      const response = await fetch('/api/crm/zalo/add-friend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          phone: lead.phone,
          name: lead.name,
          zaloOAId: zaloOAId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Lỗi kết bạn Zalo');
      }

      const data = await response.json();

      setStatus('success');
      setMessage('Kết bạn thành công');
      onSuccess?.(lead.id);

      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      setStatus('error');
      setMessage(errorMessage);
      onError?.(errorMessage);

      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  // Determine button appearance based on status
  const getButtonStyles = () => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300';
      case 'error':
        return 'bg-red-100 text-red-700 hover:bg-red-200 border-red-300';
      default:
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300';
    }
  };

  const getIcon = () => {
    if (loading) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    if (status === 'success') {
      return <CheckCircle2 className="w-4 h-4" />;
    }
    if (status === 'error') {
      return <AlertCircle className="w-4 h-4" />;
    }
    return <MessageCircle className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleAddFriend}
        disabled={loading || !lead.phone}
        title={!lead.phone ? 'Không có số điện thoại' : 'Kết bạn Zalo'}
        className={`
          inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 font-medium
          transition-all duration-200 text-sm whitespace-nowrap
          disabled:opacity-50 disabled:cursor-not-allowed
          ${getButtonStyles()}
          ${className}
        `}
      >
        {getIcon()}
        <span>{loading ? 'Đang kết bạn...' : 'Kết bạn Zalo'}</span>
      </button>

      {/* Status Message */}
      {message && (
        <div
          className={`
            text-xs px-2 py-1 rounded
            ${
              status === 'success'
                ? 'bg-green-50 text-green-700'
                : status === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-700'
            }
          `}
        >
          {message}
        </div>
      )}
    </div>
  );
}
