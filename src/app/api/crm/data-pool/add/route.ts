import { NextRequest, NextResponse } from 'next/server';

/**
 * API Endpoint: POST /api/crm/data-pool/add
 * Thêm khách hàng mới vào Data Pool
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate dữ liệu bắt buộc
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Tên và email là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Email không hợp lệ' },
        { status: 400 }
      );
    }

    // Tạo bản ghi khách hàng
    const customer = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      company: body.company || '',
      source: body.source || 'manual',
      campaign: body.campaign || '',
      tags: body.tags || [],
      notes: body.notes || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Lưu vào database (mock - trong thực tế sẽ lưu vào database thực)
    // Ở đây chúng ta sẽ trả về dữ liệu khách hàng đã tạo
    
    console.log('✅ Khách hàng đã được thêm:', customer);

    return NextResponse.json(
      {
        success: true,
        message: 'Khách hàng đã được thêm vào Data Pool',
        data: customer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Lỗi khi thêm khách hàng:', error);
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}

/**
 * API Endpoint: GET /api/crm/data-pool/add
 * Lấy danh sách khách hàng trong Data Pool
 */
export async function GET(request: NextRequest) {
  try {
    // Mock data - trong thực tế sẽ lấy từ database
    const mockCustomers = [
      {
        id: 'lead_001',
        name: 'Phạm Nhất Bá Tuất',
        email: 'contact.foodcom@gmail.com',
        phone: '0915694552',
        company: 'FoodCom',
        source: 'manual_test',
        campaign: 'Test_Gường_Công_Thái_Học',
        tags: ['B2B_Potential', 'Giường_Công_Thái_Học'],
        notes: 'Khách hàng quan tâm mua giường công thái học cho nhà hàng',
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ];

    return NextResponse.json(
      {
        success: true,
        data: mockCustomers,
        total: mockCustomers.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Lỗi khi lấy danh sách khách hàng:', error);
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}
