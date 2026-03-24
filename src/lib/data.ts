// ==========================================
// TypeScript Interfaces (Database Schema)
// ==========================================

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  totalSpent: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  description: string;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  createdAt: string;
}

export type InvoiceStatus = "مسودة" | "مدفوعة" | "غير مدفوعة" | "ملغاة";
export type OrderStatus = "قيد الانتظار" | "قيد التنفيذ" | "جاهز للاستلام" | "مكتمل";

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  items: InvoiceItem[];
  subtotal: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  notes: string;
  createdAt: string;
}

export interface Order {
  id: string;
  trackingId: string;
  clientId: string;
  clientName: string;
  description: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Data from Odoo Import
// ==========================================

export const clients: Client[] = [
  {
    "id": "odoo_c9",
    "name": "مازن مقدم",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_c18",
    "name": "محمد حنظل",
    "phone": "+90 531 200 28 71",
    "address": "الجميلية",
    "notes": "", "totalSpent": 0,
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_c10",
    "name": "نزير ورد",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 2257.5,
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_c17",
    "name": "شركة حنظل التجارية",
    "phone": "+90 531 200 28 71",
    "address": "الجميلية",
    "notes": "", "totalSpent": 0,
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_c23",
    "name": "فراس",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2025-12-03"
  },
  {
    "id": "odoo_c20",
    "name": "مركز البيان",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2025-11-22"
  },
  {
    "id": "odoo_c24",
    "name": "عبدالرحمن جنيد",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2025-12-30"
  },
  {
    "id": "odoo_c22",
    "name": "ايهاب محبك",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2025-11-22"
  },
  {
    "id": "odoo_c15",
    "name": "احمد زيدان",
    "phone": "+963 965 345 864",
    "address": "الجميلية",
    "notes": "", "totalSpent": 0,
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_c14",
    "name": "شركة زيدان وضبيط",
    "phone": "+963 965 345 864",
    "address": "الجميلية",
    "notes": "", "totalSpent": 800,
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_c12",
    "name": "مركز المقدم",
    "phone": "",
    "address": "ادلب",
    "notes": "", "totalSpent": 0,
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_c13",
    "name": "مازن مقدم",
    "phone": "+90 555 100 23 25",
    "address": "ادلب",
    "notes": "", "totalSpent": 4331.5,
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_c25",
    "name": "مركز خلدان",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2025-12-30"
  },
  {
    "id": "odoo_c16",
    "name": "عيسى العيسى",
    "phone": "+963 940 378 403",
    "address": "",
    "notes": "", "totalSpent": 835,
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_c26",
    "name": "مصطفى شعار",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2025-12-30"
  },
  {
    "id": "odoo_c19",
    "name": "رامي دحروج",
    "phone": "+90 539 792 67 13",
    "address": "",
    "notes": "", "totalSpent": 2047.5,
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_c21",
    "name": "محمد حسون",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2025-11-22"
  },
  {
    "id": "odoo_c33",
    "name": "أبو تيم منبج",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2026-03-05"
  },
  {
    "id": "odoo_c28",
    "name": "ياسر أشمر",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2026-01-31"
  },
  {
    "id": "odoo_c30",
    "name": "نزار ريحاوي",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2026-02-09"
  },
  {
    "id": "odoo_c29",
    "name": "أيمن الكايا",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2026-01-31"
  },
  {
    "id": "odoo_c31",
    "name": "شركة بيت الطباعة",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2026-02-18"
  },
  {
    "id": "odoo_c32",
    "name": "حمزة حرستاني",
    "phone": "",
    "address": "",
    "notes": "", "totalSpent": 0,
    "createdAt": "2026-02-18"
  }
];

export const products: Product[] = [
  {
    "id": "odoo_p8",
    "name": "EP 108 dye ink Light Magneta",
    "category": "حبر",
    "sku": "",
    "description": "EP 108 dye ink Light Magneta",
    "price": 1,
    "stock": 50,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p10",
    "name": "EP 108 dye ink Magenta",
    "category": "حبر",
    "sku": "",
    "description": "EP 108 dye ink Magenta",
    "price": 1,
    "stock": 50,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p12",
    "name": "EP C21000 dye ink Master Book V63.2 Black",
    "category": "حبر",
    "sku": "",
    "description": "EP C21000 dye ink Master Book V63.2 Black",
    "price": 7,
    "stock": 480,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p11",
    "name": "EP 108 dye ink Yellow",
    "category": "حبر",
    "sku": "",
    "description": "EP 108 dye ink Yellow",
    "price": 1,
    "stock": 50,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p1",
    "name": "رسوم الحجز",
    "category": "حبر",
    "sku": "",
    "description": "Booking Fees",
    "price": 50,
    "stock": 0,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-03"
  },
  {
    "id": "odoo_p2",
    "name": "CN Maxify Dye Ink Black 1 LT",
    "category": "حبر",
    "sku": "",
    "description": "CN Maxify Dye Ink Black 1 LT",
    "price": 5.5,
    "stock": 64,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-03"
  },
  {
    "id": "odoo_p25",
    "name": "Topclass EP v58 1LT Black",
    "category": "حبر",
    "sku": "",
    "description": "Topclass EP v58 1LT Black",
    "price": 5.5,
    "stock": 640,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p6",
    "name": "EP 108 dye ink Black",
    "category": "حبر",
    "sku": "",
    "description": "EP 108 dye ink Black",
    "price": 1,
    "stock": 50,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p27",
    "name": "Topclass EP v58 1LT Magenta",
    "category": "حبر",
    "sku": "",
    "description": "Topclass EP v58 1LT Magenta",
    "price": 5.5,
    "stock": 752,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p28",
    "name": "Topclass EP v58 1LT Yellow",
    "category": "حبر",
    "sku": "",
    "description": "Topclass EP v58 1LT Yellow",
    "price": 5.5,
    "stock": 720,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p19",
    "name": "Master Book Magic Magenta 1LT",
    "category": "حبر",
    "sku": "",
    "description": "Master Book Magic Magenta 1LT",
    "price": 5.5,
    "stock": 448,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p17",
    "name": "Master Book Magic Black 1LT",
    "category": "حبر",
    "sku": "",
    "description": "Master Book Magic Black 1LT",
    "price": 5.5,
    "stock": 432,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p18",
    "name": "Master Book Magic Cyan 1LT",
    "category": "حبر",
    "sku": "",
    "description": "Master Book Magic Cyan 1LT",
    "price": 5.5,
    "stock": 528,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p36",
    "name": "بطاقة الهدايا",
    "category": "حبر",
    "sku": "",
    "description": "بطاقة الهدايا",
    "price": 0,
    "stock": 0,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_p20",
    "name": "Master Book Magic Yellow 1LT",
    "category": "حبر",
    "sku": "",
    "description": "Master Book Magic Yellow 1LT",
    "price": 5.5,
    "stock": 608,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p38",
    "name": "CN Maxify Dye Ink 1 LT - CMYK Set",
    "category": "حبر",
    "sku": "",
    "description": "CN Maxify Dye Ink 1 LT - CMYK Set",
    "price": 8,
    "stock": 0,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-07"
  },
  {
    "id": "odoo_p14",
    "name": "EP C21000 dye ink Master Book V63.2 Magenta",
    "category": "حبر",
    "sku": "",
    "description": "EP C21000 dye ink Master Book V63.2 Magenta",
    "price": 7,
    "stock": 480,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p40",
    "name": "Epson L8050 EcoTank Printer",
    "category": "طابعة",
    "sku": "",
    "description": "Epson L8050 EcoTank Printer",
    "price": 350,
    "stock": 15,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-12-30"
  },
  {
    "id": "odoo_p39",
    "name": " Canon Pixma G3410 Printer",
    "category": "طابعة",
    "sku": "",
    "description": " Canon Pixma G3410 Printer",
    "price": 105,
    "stock": 300,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-12-30"
  },
  {
    "id": "odoo_p5",
    "name": "CN Maxify Dye Ink Yellow Lt",
    "category": "حبر",
    "sku": "",
    "description": "CN Maxify Dye Ink Yellow Lt",
    "price": 5.5,
    "stock": 64,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p4",
    "name": "CN Maxify Dye Ink Magenta 1Lt",
    "category": "حبر",
    "sku": "",
    "description": "CN Maxify Dye Ink Magenta 1Lt",
    "price": 5.5,
    "stock": 64,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p3",
    "name": "CN Maxify Dye Ink Cyan 1Lt",
    "category": "حبر",
    "sku": "",
    "description": "CN Maxify Dye Ink Cyan 1Lt",
    "price": 5.5,
    "stock": 64,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p13",
    "name": "EP C21000 dye ink Master Book V63.2 Cyan",
    "category": "حبر",
    "sku": "",
    "description": "EP C21000 dye ink Master Book V63.2 Cyan",
    "price": 7,
    "stock": 480,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p15",
    "name": "EP C21000 dye ink Master Book V63.2 Yellow",
    "category": "حبر",
    "sku": "",
    "description": "EP C21000 dye ink Master Book V63.2 Yellow",
    "price": 7,
    "stock": 480,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p16",
    "name": "Epson c5790 Ve C5890 Tank",
    "category": "ملحقات",
    "sku": "",
    "description": "Epson c5790 Ve C5890 Tank",
    "price": 13.75,
    "stock": 255,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p21",
    "name": "Masterbook Hp pigment v77 1LT Black",
    "category": "حبر",
    "sku": "",
    "description": "Masterbook Hp pigment v77 1LT Black",
    "price": 12,
    "stock": 32,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p34",
    "name": "بطاقة الهدايا",
    "category": "حبر",
    "sku": "",
    "description": "Gift Card",
    "price": 50,
    "stock": 0,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_p35",
    "name": "زيادة رصيد المحفظة الإلكترونية",
    "category": "حبر",
    "sku": "",
    "description": "Top-up eWallet",
    "price": 50,
    "stock": 0,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_p22",
    "name": "Masterbook Hp pigment v77 1LT Cyan",
    "category": "حبر",
    "sku": "",
    "description": "Masterbook Hp pigment v77 1LT Cyan",
    "price": 12,
    "stock": 32,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p37",
    "name": "خصم",
    "category": "حبر",
    "sku": "",
    "description": "خصم",
    "price": 0,
    "stock": 0,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_p23",
    "name": "Masterbook Hp pigment v77 1LT Magenta",
    "category": "حبر",
    "sku": "",
    "description": "Masterbook Hp pigment v77 1LT Magenta",
    "price": 12,
    "stock": 32,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p24",
    "name": "Masterbook Hp pigment v77 1LT Yellow",
    "category": "حبر",
    "sku": "",
    "description": "Masterbook Hp pigment v77 1LT Yellow",
    "price": 12,
    "stock": 32,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p7",
    "name": "EP 108 dye ink Cyan",
    "category": "حبر",
    "sku": "",
    "description": "EP 108 dye ink Cyan",
    "price": 1,
    "stock": 50,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p9",
    "name": "EP 108 dye ink Light Cyan",
    "category": "حبر",
    "sku": "",
    "description": "EP 108 dye ink Light Cyan",
    "price": 1,
    "stock": 50,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p26",
    "name": "Topclass EP v58 1LT Cyan",
    "category": "حبر",
    "sku": "",
    "description": "Topclass EP v58 1LT Cyan",
    "price": 5.5,
    "stock": 768,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2025-11-04"
  },
  {
    "id": "odoo_p41",
    "name": "Epson L8050 Wi-Fi",
    "category": "حبر",
    "sku": "",
    "description": "Epson L8050 Wi-Fi",
    "price": 220,
    "stock": 1,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2026-02-09"
  },
  {
    "id": "odoo_p42",
    "name": "WorkForce Pro WF-C5890DWF",
    "category": "حبر",
    "sku": "",
    "description": "WorkForce Pro WF-C5890DWF",
    "price": 420,
    "stock": 106,
    "minStock": 5,
    "unit": "قطعة",
    "createdAt": "2026-03-05"
  }
];

export const invoices: Invoice[] = [
  {
    "id": "odoo_inv11",
    "invoiceNumber": "الفات/2025/00007",
    "clientId": "odoo_c17",
    "clientName": "شركة حنظل التجارية",
    "items": [
      {
        "id": "odoo_il53",
        "productId": "odoo_p17",
        "productName": "Master Book Magic Black 1LT",
        "description": "",
        "quantity": 64,
        "unitPrice": 5.5,
        "total": 352
      },
      {
        "id": "odoo_il54",
        "productId": "odoo_p18",
        "productName": "Master Book Magic Cyan 1LT",
        "description": "",
        "quantity": 80,
        "unitPrice": 5.5,
        "total": 440
      },
      {
        "id": "odoo_il55",
        "productId": "odoo_p19",
        "productName": "Master Book Magic Magenta 1LT",
        "description": "",
        "quantity": 80,
        "unitPrice": 5.5,
        "total": 440
      },
      {
        "id": "odoo_il56",
        "productId": "odoo_p20",
        "productName": "Master Book Magic Yellow 1LT",
        "description": "",
        "quantity": 96,
        "unitPrice": 5.5,
        "total": 528
      },
      {
        "id": "odoo_il57",
        "productId": "odoo_p25",
        "productName": "Topclass EP v58 1LT Black",
        "description": "",
        "quantity": 32,
        "unitPrice": 5.5,
        "total": 176
      },
      {
        "id": "odoo_il58",
        "productId": "odoo_p3",
        "productName": "CN Maxify Dye Ink Cyan 1Lt",
        "description": "",
        "quantity": 32,
        "unitPrice": 5.5,
        "total": 176
      },
      {
        "id": "odoo_il59",
        "productId": "odoo_p27",
        "productName": "Topclass EP v58 1LT Magenta",
        "description": "",
        "quantity": 96,
        "unitPrice": 5.5,
        "total": 528
      },
      {
        "id": "odoo_il60",
        "productId": "odoo_p28",
        "productName": "Topclass EP v58 1LT Yellow",
        "description": "",
        "quantity": 32,
        "unitPrice": 5.5,
        "total": 176
      }
    ],
    "subtotal": 2816,
    "discountType": "fixed",
    "discountValue": 0,
    "discountAmount": 0,
    "taxAmount": 0,
    "total": 2816,
    "status": "ملغاة",
    "notes": "",
    "createdAt": "2025-11-07"
  },
  {
    "id": "odoo_inv8",
    "invoiceNumber": "الفات/2025/00006",
    "clientId": "odoo_c19",
    "clientName": "رامي دحروج",
    "items": [
      {
        "id": "odoo_il47",
        "productId": "odoo_p16",
        "productName": "Epson c5790 Ve C5890 Tank",
        "description": "",
        "quantity": 150,
        "unitPrice": 13.65,
        "total": 2047.5
      }
    ],
    "subtotal": 2047.5,
    "discountType": "fixed",
    "discountValue": 0,
    "discountAmount": 0,
    "taxAmount": 0,
    "total": 2047.5,
    "status": "مدفوعة",
    "notes": "",
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_inv5",
    "invoiceNumber": "الفات/2025/00004",
    "clientId": "odoo_c16",
    "clientName": "عيسى العيسى",
    "items": [
      {
        "id": "odoo_il29",
        "productId": "odoo_p25",
        "productName": "Topclass EP v58 1LT Black",
        "description": "",
        "quantity": 20,
        "unitPrice": 5.25,
        "total": 105
      },
      {
        "id": "odoo_il30",
        "productId": "odoo_p26",
        "productName": "Topclass EP v58 1LT Cyan",
        "description": "",
        "quantity": 36,
        "unitPrice": 5.25,
        "total": 189
      },
      {
        "id": "odoo_il31",
        "productId": "odoo_p27",
        "productName": "Topclass EP v58 1LT Magenta",
        "description": "",
        "quantity": 20,
        "unitPrice": 5.25,
        "total": 105
      },
      {
        "id": "odoo_il32",
        "productId": "odoo_p28",
        "productName": "Topclass EP v58 1LT Yellow",
        "description": "",
        "quantity": 20,
        "unitPrice": 5.25,
        "total": 105
      },
      {
        "id": "odoo_il33",
        "productId": "odoo_p16",
        "productName": "Epson c5790 Ve C5890 Tank",
        "description": "",
        "quantity": 25,
        "unitPrice": 13.75,
        "total": 343.75
      },
      {
        "id": "odoo_il34",
        "productId": "odoo_p37",
        "productName": "خصم",
        "description": "",
        "quantity": 1,
        "unitPrice": -12.75,
        "total": -12.75
      }
    ],
    "subtotal": 835,
    "discountType": "fixed",
    "discountValue": 0,
    "discountAmount": 0,
    "taxAmount": 0,
    "total": 835,
    "status": "مدفوعة",
    "notes": "",
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_inv4",
    "invoiceNumber": "الفات/2025/00003",
    "clientId": "odoo_c14",
    "clientName": "شركة زيدان وضبيط",
    "items": [
      {
        "id": "odoo_il19",
        "productId": "odoo_p25",
        "productName": "Topclass EP v58 1LT Black",
        "description": "",
        "quantity": 17,
        "unitPrice": 5.25,
        "total": 89.25
      },
      {
        "id": "odoo_il20",
        "productId": "odoo_p26",
        "productName": "Topclass EP v58 1LT Cyan",
        "description": "",
        "quantity": 17,
        "unitPrice": 5.25,
        "total": 89.25
      },
      {
        "id": "odoo_il21",
        "productId": "odoo_p27",
        "productName": "Topclass EP v58 1LT Magenta",
        "description": "",
        "quantity": 17,
        "unitPrice": 5.25,
        "total": 89.25
      },
      {
        "id": "odoo_il27",
        "productId": "odoo_p37",
        "productName": "خصم",
        "description": "",
        "quantity": 1,
        "unitPrice": -5,
        "total": -5
      },
      {
        "id": "odoo_il22",
        "productId": "odoo_p28",
        "productName": "Topclass EP v58 1LT Yellow",
        "description": "",
        "quantity": 17,
        "unitPrice": 5.25,
        "total": 89.25
      },
      {
        "id": "odoo_il23",
        "productId": "odoo_p12",
        "productName": "EP C21000 dye ink Master Book V63.2 Black",
        "description": "",
        "quantity": 16,
        "unitPrice": 7,
        "total": 112
      },
      {
        "id": "odoo_il24",
        "productId": "odoo_p13",
        "productName": "EP C21000 dye ink Master Book V63.2 Cyan",
        "description": "",
        "quantity": 16,
        "unitPrice": 7,
        "total": 112
      },
      {
        "id": "odoo_il25",
        "productId": "odoo_p14",
        "productName": "EP C21000 dye ink Master Book V63.2 Magenta",
        "description": "",
        "quantity": 16,
        "unitPrice": 7,
        "total": 112
      },
      {
        "id": "odoo_il26",
        "productId": "odoo_p15",
        "productName": "EP C21000 dye ink Master Book V63.2 Yellow",
        "description": "",
        "quantity": 16,
        "unitPrice": 7,
        "total": 112
      }
    ],
    "subtotal": 800,
    "discountType": "fixed",
    "discountValue": 0,
    "discountAmount": 0,
    "taxAmount": 0,
    "total": 800,
    "status": "مدفوعة",
    "notes": "",
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_inv2",
    "invoiceNumber": "الفات/2025/00002",
    "clientId": "odoo_c13",
    "clientName": "مركز المقدم, مازن مقدم",
    "items": [
      {
        "id": "odoo_il7",
        "productId": "odoo_p25",
        "productName": "Topclass EP v58 1LT Black",
        "description": "",
        "quantity": 16,
        "unitPrice": 4.75,
        "total": 76
      },
      {
        "id": "odoo_il8",
        "productId": "odoo_p26",
        "productName": "Topclass EP v58 1LT Cyan",
        "description": "",
        "quantity": 96,
        "unitPrice": 4.75,
        "total": 456
      },
      {
        "id": "odoo_il9",
        "productId": "odoo_p27",
        "productName": "Topclass EP v58 1LT Magenta",
        "description": "",
        "quantity": 64,
        "unitPrice": 4.75,
        "total": 304
      },
      {
        "id": "odoo_il11",
        "productId": "odoo_p17",
        "productName": "Master Book Magic Black 1LT",
        "description": "",
        "quantity": 64,
        "unitPrice": 5.25,
        "total": 336
      },
      {
        "id": "odoo_il12",
        "productId": "odoo_p18",
        "productName": "Master Book Magic Cyan 1LT",
        "description": "",
        "quantity": 144,
        "unitPrice": 5.25,
        "total": 756
      },
      {
        "id": "odoo_il13",
        "productId": "odoo_p19",
        "productName": "Master Book Magic Magenta 1LT",
        "description": "",
        "quantity": 96,
        "unitPrice": 5.25,
        "total": 504
      },
      {
        "id": "odoo_il14",
        "productId": "odoo_p20",
        "productName": "Master Book Magic Yellow 1LT",
        "description": "",
        "quantity": 144,
        "unitPrice": 5.25,
        "total": 756
      },
      {
        "id": "odoo_il15",
        "productId": "odoo_p16",
        "productName": "Epson c5790 Ve C5890 Tank",
        "description": "",
        "quantity": 50,
        "unitPrice": 13.75,
        "total": 687.5
      },
      {
        "id": "odoo_il10",
        "productId": "odoo_p28",
        "productName": "Topclass EP v58 1LT Yellow",
        "description": "",
        "quantity": 96,
        "unitPrice": 4.75,
        "total": 456
      }
    ],
    "subtotal": 4331.5,
    "discountType": "fixed",
    "discountValue": 0,
    "discountAmount": 0,
    "taxAmount": 0,
    "total": 4331.5,
    "status": "مدفوعة",
    "notes": "",
    "createdAt": "2025-11-05"
  },
  {
    "id": "odoo_inv1",
    "invoiceNumber": "الفات/2025/00001",
    "clientId": "odoo_c10",
    "clientName": "نزير ورد",
    "items": [
      {
        "id": "odoo_il1",
        "productId": "odoo_p16",
        "productName": "Epson c5790 Ve C5890 Tank",
        "description": "",
        "quantity": 30,
        "unitPrice": 13.65,
        "total": 409.5
      },
      {
        "id": "odoo_il2",
        "productId": "odoo_p25",
        "productName": "Topclass EP v58 1LT Black",
        "description": "",
        "quantity": 80,
        "unitPrice": 5.25,
        "total": 420
      },
      {
        "id": "odoo_il3",
        "productId": "odoo_p26",
        "productName": "Topclass EP v58 1LT Cyan",
        "description": "",
        "quantity": 112,
        "unitPrice": 5.25,
        "total": 588
      },
      {
        "id": "odoo_il4",
        "productId": "odoo_p27",
        "productName": "Topclass EP v58 1LT Magenta",
        "description": "",
        "quantity": 80,
        "unitPrice": 5.25,
        "total": 420
      },
      {
        "id": "odoo_il5",
        "productId": "odoo_p28",
        "productName": "Topclass EP v58 1LT Yellow",
        "description": "",
        "quantity": 80,
        "unitPrice": 5.25,
        "total": 420
      }
    ],
    "subtotal": 2257.5,
    "discountType": "fixed",
    "discountValue": 0,
    "discountAmount": 0,
    "taxAmount": 0,
    "total": 2257.5,
    "status": "مدفوعة",
    "notes": "",
    "createdAt": "2025-11-04"
  }
];

export const orders: Order[] = [
  {
    "id": "odoo_o16",
    "trackingId": "S00016",
    "clientId": "odoo_c22",
    "clientName": "ايهاب محبك",
    "description": "EP C21000 dye ink Master Book V63.2 Black × 4، EP C21000 dye ink Master Book V63.2 Cyan × 4، EP C21000 dye ink Master Book V63.2 Magenta × 4، EP C21000 dye ink Master Book V63.2 Yellow × 4",
    "status": "جاهز للاستلام",
    "createdAt": "2025-11-22",
    "updatedAt": "2025-12-01"
  },
  {
    "id": "odoo_o15",
    "trackingId": "S00015",
    "clientId": "odoo_c21",
    "clientName": "محمد حسون",
    "description": "Topclass EP v58 1LT Black × 160، Topclass EP v58 1LT Cyan × 160، Topclass EP v58 1LT Magenta × 160، Topclass EP v58 1LT Yellow × 160، EP C21000 dye ink Master Book V63.2 Black × 16، EP C21000 dye ink Master Book V63.2 Cyan × 16، EP C21000 dye ink Master Book V63.2 Magenta × 16، EP C21000 dye ink Master Book V63.2 Yellow × 16",
    "status": "جاهز للاستلام",
    "createdAt": "2025-11-22",
    "updatedAt": "2025-12-01"
  },
  {
    "id": "odoo_o8",
    "trackingId": "S00008",
    "clientId": "odoo_c14",
    "clientName": "شركة زيدان وضبيط",
    "description": "Topclass EP v58 1LT Black × 17، Topclass EP v58 1LT Cyan × 17، Topclass EP v58 1LT Magenta × 17، Topclass EP v58 1LT Yellow × 17، EP C21000 dye ink Master Book V63.2 Black × 16، EP C21000 dye ink Master Book V63.2 Cyan × 16، EP C21000 dye ink Master Book V63.2 Magenta × 16، خصم × 1، EP C21000 dye ink Master Book V63.2 Yellow × 16",
    "status": "مكتمل",
    "createdAt": "2025-11-05",
    "updatedAt": "2025-11-05"
  },
  {
    "id": "odoo_o14",
    "trackingId": "S00014",
    "clientId": "odoo_c19",
    "clientName": "رامي دحروج",
    "description": "Master Book Magic Black 1LT × 32، Master Book Magic Yellow 1LT × 48، Master Book Magic Magenta 1LT × 32، Master Book Magic Cyan 1LT × 32، Topclass EP v58 1LT Black × 32، Topclass EP v58 1LT Yellow × 48، Topclass EP v58 1LT Magenta × 32، Topclass EP v58 1LT Cyan × 48",
    "status": "جاهز للاستلام",
    "createdAt": "2025-11-22",
    "updatedAt": "2025-11-22"
  },
  {
    "id": "odoo_o5",
    "trackingId": "S00005",
    "clientId": "odoo_c9",
    "clientName": "مازن مقدم",
    "description": "طلب بيع S00005",
    "status": "قيد الانتظار",
    "createdAt": "2025-11-04",
    "updatedAt": "2025-11-04"
  },
  {
    "id": "odoo_o17",
    "trackingId": "S00017",
    "clientId": "odoo_c23",
    "clientName": "فراس",
    "description": "Master Book Magic Black 1LT × 2، Master Book Magic Cyan 1LT × 2، Master Book Magic Magenta 1LT × 2، Master Book Magic Yellow 1LT × 2",
    "status": "جاهز للاستلام",
    "createdAt": "2025-12-03",
    "updatedAt": "2025-12-03"
  },
  {
    "id": "odoo_o12",
    "trackingId": "S00012",
    "clientId": "odoo_c17",
    "clientName": "شركة حنظل التجارية",
    "description": "Topclass EP v58 1LT Cyan × 32، CN Maxify Dye Ink Cyan 1Lt × 32، Master Book Magic Black 1LT × 64، Master Book Magic Cyan 1LT × 80، Master Book Magic Magenta 1LT × 80، Master Book Magic Yellow 1LT × 96، Topclass EP v58 1LT Black × 32، خصم × 1، Topclass EP v58 1LT Magenta × 96، Topclass EP v58 1LT Yellow × 32",
    "status": "جاهز للاستلام",
    "createdAt": "2025-11-07",
    "updatedAt": "2025-11-10"
  },
  {
    "id": "odoo_o10",
    "trackingId": "S00010",
    "clientId": "odoo_c16",
    "clientName": "عيسى العيسى",
    "description": "Topclass EP v58 1LT Black × 20، Topclass EP v58 1LT Cyan × 36، Topclass EP v58 1LT Magenta × 20، Topclass EP v58 1LT Yellow × 20، خصم × 1، Epson c5790 Ve C5890 Tank × 25",
    "status": "مكتمل",
    "createdAt": "2025-11-05",
    "updatedAt": "2025-11-05"
  },
  {
    "id": "odoo_o4",
    "trackingId": "S00004",
    "clientId": "odoo_c10",
    "clientName": "نزير ورد",
    "description": "Epson c5790 Ve C5890 Tank × 30، Topclass EP v58 1LT Black × 80، Topclass EP v58 1LT Cyan × 112، Topclass EP v58 1LT Magenta × 80، Topclass EP v58 1LT Yellow × 80",
    "status": "مكتمل",
    "createdAt": "2025-11-04",
    "updatedAt": "2025-11-04"
  },
  {
    "id": "odoo_o18",
    "trackingId": "S00018",
    "clientId": "odoo_c18",
    "clientName": "محمد حنظل",
    "description": "Topclass EP v58 1LT Cyan × 16، Topclass EP v58 1LT Magenta × 16، Topclass EP v58 1LT Yellow × 16، Master Book Magic Yellow 1LT × 16، Topclass EP v58 1LT Black × 16",
    "status": "جاهز للاستلام",
    "createdAt": "2025-12-09",
    "updatedAt": "2025-12-09"
  },
  {
    "id": "odoo_o19",
    "trackingId": "S00019",
    "clientId": "odoo_c23",
    "clientName": "فراس",
    "description": "Master Book Magic Black 1LT × 19، Master Book Magic Cyan 1LT × 19، Master Book Magic Magenta 1LT × 19، Master Book Magic Yellow 1LT × 19",
    "status": "جاهز للاستلام",
    "createdAt": "2025-12-24",
    "updatedAt": "2025-12-24"
  },
  {
    "id": "odoo_o24",
    "trackingId": "S00024",
    "clientId": "odoo_c22",
    "clientName": "ايهاب محبك",
    "description": " Canon Pixma G3410 Printer × 2",
    "status": "جاهز للاستلام",
    "createdAt": "2026-01-04",
    "updatedAt": "2026-01-04"
  },
  {
    "id": "odoo_o21",
    "trackingId": "S00021",
    "clientId": "odoo_c24",
    "clientName": "عبدالرحمن جنيد",
    "description": "Topclass EP v58 1LT Black × 16، Topclass EP v58 1LT Cyan × 16، Topclass EP v58 1LT Magenta × 16، Topclass EP v58 1LT Yellow × 16، CN Maxify Dye Ink Black 1 LT × 16، CN Maxify Dye Ink Cyan 1Lt × 16، CN Maxify Dye Ink Magenta 1Lt × 16، CN Maxify Dye Ink Yellow Lt × 16، Master Book Magic Black 1LT × 16، Master Book Magic Cyan 1LT × 16، Master Book Magic Magenta 1LT × 16، Master Book Magic Yellow 1LT × 16",
    "status": "جاهز للاستلام",
    "createdAt": "2025-12-30",
    "updatedAt": "2025-12-30"
  },
  {
    "id": "odoo_o26",
    "trackingId": "S00026",
    "clientId": "odoo_c18",
    "clientName": "محمد حنظل",
    "description": "Epson L8050 EcoTank Printer × 4",
    "status": "جاهز للاستلام",
    "createdAt": "2026-01-28",
    "updatedAt": "2026-01-28"
  },
  {
    "id": "odoo_o7",
    "trackingId": "S00007",
    "clientId": "odoo_c13",
    "clientName": "مازن مقدم",
    "description": "Topclass EP v58 1LT Black × 16، Topclass EP v58 1LT Cyan × 96، Topclass EP v58 1LT Magenta × 64، Topclass EP v58 1LT Yellow × 96، Master Book Magic Black 1LT × 64، Master Book Magic Cyan 1LT × 144، Master Book Magic Magenta 1LT × 96، Master Book Magic Yellow 1LT × 144، Epson c5790 Ve C5890 Tank × 50، خصم × 1",
    "status": "مكتمل",
    "createdAt": "2025-11-05",
    "updatedAt": "2025-11-05"
  },
  {
    "id": "odoo_o22",
    "trackingId": "S00022",
    "clientId": "odoo_c24",
    "clientName": "عبدالرحمن جنيد",
    "description": " Canon Pixma G3410 Printer × 25",
    "status": "جاهز للاستلام",
    "createdAt": "2025-12-30",
    "updatedAt": "2025-12-30"
  },
  {
    "id": "odoo_o25",
    "trackingId": "S00025",
    "clientId": "odoo_c27",
    "clientName": "عميل 27",
    "description": " Canon Pixma G3410 Printer × 1",
    "status": "جاهز للاستلام",
    "createdAt": "2026-01-04",
    "updatedAt": "2026-01-04"
  },
  {
    "id": "odoo_o11",
    "trackingId": "S00011",
    "clientId": "odoo_c19",
    "clientName": "رامي دحروج",
    "description": "Epson c5790 Ve C5890 Tank × 150",
    "status": "مكتمل",
    "createdAt": "2025-11-05",
    "updatedAt": "2025-11-05"
  },
  {
    "id": "odoo_o20",
    "trackingId": "S00020",
    "clientId": "odoo_c23",
    "clientName": "فراس",
    "description": "Master Book Magic Black 1LT × 5، Master Book Magic Cyan 1LT × 5، Master Book Magic Magenta 1LT × 5، Master Book Magic Yellow 1LT × 5",
    "status": "جاهز للاستلام",
    "createdAt": "2025-12-25",
    "updatedAt": "2025-12-25"
  },
  {
    "id": "odoo_o23",
    "trackingId": "S00023",
    "clientId": "odoo_c25",
    "clientName": "مركز خلدان",
    "description": "Master Book Magic Black 1LT × 32، Master Book Magic Cyan 1LT × 32، Master Book Magic Magenta 1LT × 32، Master Book Magic Yellow 1LT × 32",
    "status": "جاهز للاستلام",
    "createdAt": "2025-12-30",
    "updatedAt": "2025-12-30"
  },
  {
    "id": "odoo_o29",
    "trackingId": "S00029",
    "clientId": "odoo_c19",
    "clientName": "رامي دحروج",
    "description": "Master Book Magic Black 1LT × 16، Master Book Magic Cyan 1LT × 16، Master Book Magic Magenta 1LT × 16، Master Book Magic Yellow 1LT × 16",
    "status": "جاهز للاستلام",
    "createdAt": "2026-01-31",
    "updatedAt": "2026-01-31"
  },
  {
    "id": "odoo_o33",
    "trackingId": "S00033",
    "clientId": "odoo_c30",
    "clientName": "نزار ريحاوي",
    "description": " Canon Pixma G3410 Printer × 6",
    "status": "جاهز للاستلام",
    "createdAt": "2026-02-09",
    "updatedAt": "2026-02-09"
  },
  {
    "id": "odoo_o34",
    "trackingId": "S00034",
    "clientId": "odoo_c30",
    "clientName": "نزار ريحاوي",
    "description": "طلب بيع S00034",
    "status": "قيد الانتظار",
    "createdAt": "2026-02-15",
    "updatedAt": "2026-02-15"
  },
  {
    "id": "odoo_o27",
    "trackingId": "S00027",
    "clientId": "odoo_c19",
    "clientName": "رامي دحروج",
    "description": "Topclass EP v58 1LT Black × 16، Topclass EP v58 1LT Cyan × 16، Topclass EP v58 1LT Magenta × 16، Topclass EP v58 1LT Yellow × 16",
    "status": "جاهز للاستلام",
    "createdAt": "2026-01-29",
    "updatedAt": "2026-01-29"
  },
  {
    "id": "odoo_o31",
    "trackingId": "S00031",
    "clientId": "odoo_c27",
    "clientName": "عميل 27",
    "description": " Canon Pixma G3410 Printer × 5",
    "status": "جاهز للاستلام",
    "createdAt": "2026-02-05",
    "updatedAt": "2026-02-05"
  },
  {
    "id": "odoo_o32",
    "trackingId": "S00032",
    "clientId": "odoo_c21",
    "clientName": "محمد حسون",
    "description": "Topclass EP v58 1LT Black × 48، Topclass EP v58 1LT Cyan × 48، Topclass EP v58 1LT Magenta × 48، Topclass EP v58 1LT Yellow × 80",
    "status": "جاهز للاستلام",
    "createdAt": "2026-02-09",
    "updatedAt": "2026-02-09"
  },
  {
    "id": "odoo_o28",
    "trackingId": "S00028",
    "clientId": "odoo_c29",
    "clientName": "أيمن الكايا",
    "description": " Canon Pixma G3410 Printer × 1",
    "status": "جاهز للاستلام",
    "createdAt": "2026-01-31",
    "updatedAt": "2026-01-31"
  },
  {
    "id": "odoo_o40",
    "trackingId": "S00040",
    "clientId": "odoo_c24",
    "clientName": "عبدالرحمن جنيد",
    "description": " Canon Pixma G3410 Printer × 10، Master Book Magic Black 1LT × 16، Master Book Magic Cyan 1LT × 16، Master Book Magic Magenta 1LT × 16، Master Book Magic Yellow 1LT × 16",
    "status": "جاهز للاستلام",
    "createdAt": "2026-02-26",
    "updatedAt": "2026-02-26"
  },
  {
    "id": "odoo_o30",
    "trackingId": "S00030",
    "clientId": "odoo_c23",
    "clientName": "فراس",
    "description": "Master Book Magic Black 1LT × 11، Master Book Magic Cyan 1LT × 11، Master Book Magic Magenta 1LT × 11، Master Book Magic Yellow 1LT × 11",
    "status": "جاهز للاستلام",
    "createdAt": "2026-01-31",
    "updatedAt": "2026-01-31"
  },
  {
    "id": "odoo_o35",
    "trackingId": "S00035",
    "clientId": "odoo_c30",
    "clientName": "نزار ريحاوي",
    "description": "Epson L8050 EcoTank Printer × 1",
    "status": "جاهز للاستلام",
    "createdAt": "2026-02-15",
    "updatedAt": "2026-02-15"
  },
  {
    "id": "odoo_o36",
    "trackingId": "S00036",
    "clientId": "odoo_c19",
    "clientName": "رامي دحروج",
    "description": "Master Book Magic Black 1LT × 16، Master Book Magic Cyan 1LT × 16، Master Book Magic Magenta 1LT × 16، Master Book Magic Yellow 1LT × 16",
    "status": "جاهز للاستلام",
    "createdAt": "2026-02-18",
    "updatedAt": "2026-02-18"
  },
  {
    "id": "odoo_o37",
    "trackingId": "S00037",
    "clientId": "odoo_c31",
    "clientName": "شركة بيت الطباعة",
    "description": "Topclass EP v58 1LT Black × 8، Topclass EP v58 1LT Cyan × 8، Topclass EP v58 1LT Magenta × 8، Topclass EP v58 1LT Yellow × 8",
    "status": "جاهز للاستلام",
    "createdAt": "2026-02-18",
    "updatedAt": "2026-02-18"
  },
  {
    "id": "odoo_o39",
    "trackingId": "S00039",
    "clientId": "odoo_c17",
    "clientName": "شركة حنظل التجارية",
    "description": "Master Book Magic Black 1LT × 32،  Canon Pixma G3410 Printer × 10، Master Book Magic Cyan 1LT × 32، Master Book Magic Magenta 1LT × 32، Master Book Magic Yellow 1LT × 32",
    "status": "جاهز للاستلام",
    "createdAt": "2026-02-21",
    "updatedAt": "2026-02-21"
  },
  {
    "id": "odoo_o38",
    "trackingId": "S00038",
    "clientId": "odoo_c10",
    "clientName": "نزير ورد",
    "description": "Topclass EP v58 1LT Black × 16",
    "status": "جاهز للاستلام",
    "createdAt": "2026-02-18",
    "updatedAt": "2026-02-18"
  },
  {
    "id": "odoo_o41",
    "trackingId": "S00041",
    "clientId": "odoo_c10",
    "clientName": "نزير ورد",
    "description": "Topclass EP v58 1LT Black × 16، Topclass EP v58 1LT Cyan × 16، Topclass EP v58 1LT Magenta × 16، Topclass EP v58 1LT Yellow × 16",
    "status": "جاهز للاستلام",
    "createdAt": "2026-02-26",
    "updatedAt": "2026-02-26"
  },
  {
    "id": "odoo_o43",
    "trackingId": "S00043",
    "clientId": "odoo_c33",
    "clientName": "أبو تيم منبج",
    "description": " Canon Pixma G3410 Printer × 5، Master Book Magic Black 1LT × 6، Topclass EP v58 1LT Black × 6",
    "status": "جاهز للاستلام",
    "createdAt": "2026-03-05",
    "updatedAt": "2026-03-05"
  },
  {
    "id": "odoo_o45",
    "trackingId": "S00045",
    "clientId": "odoo_c31",
    "clientName": "شركة بيت الطباعة",
    "description": "Topclass EP v58 1LT Black × 16، Topclass EP v58 1LT Cyan × 16، Topclass EP v58 1LT Magenta × 16، Topclass EP v58 1LT Yellow × 16، CN Maxify Dye Ink Black 1 LT × 4، CN Maxify Dye Ink Cyan 1Lt × 4، CN Maxify Dye Ink Magenta 1Lt × 4، CN Maxify Dye Ink Yellow Lt × 4، Master Book Magic Black 1LT × 4، Master Book Magic Cyan 1LT × 4، Master Book Magic Magenta 1LT × 4، Master Book Magic Yellow 1LT × 4، EP C21000 dye ink Master Book V63.2 Black × 4، EP C21000 dye ink Master Book V63.2 Cyan × 4، EP C21000 dye ink Master Book V63.2 Magenta × 4، EP C21000 dye ink Master Book V63.2 Yellow × 4",
    "status": "جاهز للاستلام",
    "createdAt": "2026-03-05",
    "updatedAt": "2026-03-05"
  }
];


// ==========================================
// Helper Functions
// ==========================================

export function getLowStockProducts(productsList: Product[]): Product[] {
  return productsList.filter((p) => p.stock <= p.minStock);
}

export function getTotalRevenue(invoicesList: Invoice[]): number {
  return invoicesList
    .filter((inv) => inv.status === "مدفوعة")
    .reduce((sum, inv) => sum + inv.total, 0);
}

export function formatCurrency(amount: number, symbol = "$"): string {
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getCategoryLabel(category: Product["category"]): string {
  return category;
}

export function getStatusColor(status: InvoiceStatus): string {
  switch (status) {
    case "مدفوعة":
      return "status-badge status-badge--success";
    case "غير مدفوعة":
      return "status-badge status-badge--warning";
    case "مسودة":
      return "status-badge status-badge--muted";
    case "ملغاة":
      return "status-badge status-badge--danger";
    default:
      return "status-badge status-badge--muted";
  }
}

export function getOrderStatusColor(status: OrderStatus): string {
  switch (status) {
    case "قيد الانتظار":
      return "status-badge status-badge--warning";
    case "قيد التنفيذ":
      return "status-badge status-badge--info";
    case "جاهز للاستلام":
      return "status-badge status-badge--success";
    case "مكتمل":
      return "status-badge status-badge--purple";
    default:
      return "status-badge status-badge--muted";
  }
}

export function getStockStatusStyle(isLow: boolean): { className: string; label: string } {
  return isLow
    ? { className: "status-badge status-badge--danger", label: "منخفض" }
    : { className: "status-badge status-badge--success", label: "متوفر" };
}
