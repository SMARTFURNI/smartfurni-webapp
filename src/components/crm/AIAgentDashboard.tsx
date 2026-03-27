'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AIAgentStats {
  emailsSent: number;
  chatbotResponses: number;
  leadsScored: number;
  tasksSuggested: number;
  successRate: number;
  averageResponseTime: number;
}

interface AutomationTask {
  id: string;
  type: 'email' | 'zalo' | 'scoring' | 'task';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  leadName: string;
  createdAt: Date;
  completedAt?: Date;
}

export function AIAgentDashboard() {
  const [stats, setStats] = useState<AIAgentStats>({
    emailsSent: 0,
    chatbotResponses: 0,
    leadsScored: 0,
    tasksSuggested: 0,
    successRate: 0,
    averageResponseTime: 0,
  });

  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch AI Agent stats
    const fetchStats = async () => {
      try {
        // Mock data for now
        setStats({
          emailsSent: 42,
          chatbotResponses: 156,
          leadsScored: 28,
          tasksSuggested: 35,
          successRate: 94.5,
          averageResponseTime: 2.3,
        });

        setTasks([
          {
            id: '1',
            type: 'email',
            status: 'completed',
            leadName: 'Phạm Văn Tuất',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          },
          {
            id: '2',
            type: 'zalo',
            status: 'completed',
            leadName: 'Phạm Quốc Tuấn',
            createdAt: new Date(Date.now() - 30 * 60 * 1000),
            completedAt: new Date(Date.now() - 20 * 60 * 1000),
          },
          {
            id: '3',
            type: 'scoring',
            status: 'processing',
            leadName: 'Nam',
            createdAt: new Date(Date.now() - 5 * 60 * 1000),
          },
        ]);
      } catch (error) {
        console.error('Error fetching AI Agent stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return '✉️';
      case 'zalo':
        return '💬';
      case 'scoring':
        return '📊';
      case 'task':
        return '✓';
      default:
        return '•';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">🤖 AI Agent Dashboard</h2>
          <p className="text-gray-600 mt-1">Tự động hoá chăm sóc khách hàng B2B</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
          ⚙️ Cấu Hình AI Agent
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Email Sent */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">📧 Email Tự Động</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.emailsSent}</div>
            <p className="text-sm text-blue-600 mt-1">Email đã gửi</p>
          </CardContent>
        </Card>

        {/* Chatbot Responses */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">💬 Zalo Chatbot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.chatbotResponses}</div>
            <p className="text-sm text-green-600 mt-1">Phản hồi tự động</p>
          </CardContent>
        </Card>

        {/* Leads Scored */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">📊 Lead Scoring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.leadsScored}</div>
            <p className="text-sm text-purple-600 mt-1">Lead được chấm điểm</p>
          </CardContent>
        </Card>

        {/* Tasks Suggested */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">✓ Task Automation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.tasksSuggested}</div>
            <p className="text-sm text-orange-600 mt-1">Task được gợi ý</p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">✅ Tỷ Lệ Thành Công</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.successRate}%</div>
            <p className="text-sm text-red-600 mt-1">Tác vụ thành công</p>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">⚡ Thời Gian Phản Hồi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">{stats.averageResponseTime}s</div>
            <p className="text-sm text-indigo-600 mt-1">Trung bình</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Tác Vụ Gần Đây</CardTitle>
          <CardDescription>Các tác vụ tự động hoá được thực hiện</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Đang tải...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Chưa có tác vụ nào</div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xl">{getTypeIcon(task.type)}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{task.leadName}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(task.createdAt).toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(task.status)}>
                    {task.status === 'completed' && '✓ Hoàn thành'}
                    {task.status === 'processing' && '⏳ Đang xử lý'}
                    {task.status === 'failed' && '✗ Thất bại'}
                    {task.status === 'pending' && '⏸ Chờ'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Tính Năng Tự Động Hoá</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">📧 Email Marketing</h4>
              <p className="text-sm text-blue-700">Gửi email chào hàng, follow-up, báo giá tự động</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">💬 Zalo Chatbot</h4>
              <p className="text-sm text-green-700">Trả lời tin nhắn, gửi báo giá tự động qua Zalo</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">📊 Lead Scoring</h4>
              <p className="text-sm text-purple-700">Chấm điểm lead, phân loại Hot/Warm/Cold tự động</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold text-orange-900 mb-2">✓ Task Automation</h4>
              <p className="text-sm text-orange-700">Tạo task follow-up, gán cho nhân viên tự động</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
