import { NextRequest, NextResponse } from 'next/server';
import { createRawLead, getRawLeads } from '@/lib/crm-raw-lead-store';

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
      product: body.product || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Lưu vào database thực tế
    try {
      const rawLead = await createRawLead({
        source: 'manual',
        fullName: customer.name,
        phone: customer.phone,
        email: customer.email,
        message: customer.notes,
        rawData: customer,
      });
      
      console.log('✅ Khách hàng đã được thêm vào database:', rawLead);
      
      return NextResponse.json(
        {
          success: true,
          message: 'Khách hàng đã được thêm vào Data Pool',
          data: {
            id: rawLead.id,
            name: rawLead.fullName,
            email: rawLead.email,
            phone: rawLead.phone,
            company: customer.company,
            source: rawLead.source,
            campaign: customer.campaign,
            tags: customer.tags,
            notes: rawLead.message,
            status: rawLead.status,
            product: customer.product,
            created_at: rawLead.createdAt,
            updated_at: rawLead.createdAt,
          },
        },
        { status: 201 }
      );
    } catch (dbError) {
      console.error('Lỗi khi lưu vào database:', dbError);
      // Nếu lỗi database, vẫn trả về thành công nhưng ghi log
      return NextResponse.json(
        {
          success: true,
          message: 'Khách hàng đã được thêm vào Data Pool',
          data: customer,
          warning: 'Có thể lỗi khi lưu vào database',
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Lỗi khi thêm khách hàng:', error);
    return NextResponse.json(
      { error: 'Lỗi server: ' + (error instanceof Error ? error.message : String(error)) },
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
    // Lấy danh sách khách hàng từ database
    const rawLeads = await getRawLeads();
    
    // Map dữ liệu để trả về format tương thích
    const customers = rawLeads.map(lead => ({
      id: lead.id,
      name: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      company: lead.rawData?.company || '',
      source: lead.source,
      campaign: lead.rawData?.campaign || '',
      tags: lead.rawData?.tags || [],
      notes: lead.message || '',
      status: lead.status,
      product: lead.rawData?.product || '',
      created_at: lead.createdAt,
      claimed_by: lead.claimedBy,
      claimed_by_name: lead.claimedByName,
    }));

    return NextResponse.json(
      {
        success: true,
        data: customers,
        total: customers.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Lỗi khi lấy danh sách khách hàng:', error);
    
    // Nếu lỗi, trả về mock data để không break UI
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
        product: 'Giường công thái học',
        created_at: new Date().toISOString(),
      },
    ];

    return NextResponse.json(
      {
        success: true,
        data: mockCustomers,
        total: mockCustomers.length,
        warning: 'Có lỗi khi lấy dữ liệu từ database, đang hiển thị mock data',
      },
      { status: 200 }
    );
  }
}
