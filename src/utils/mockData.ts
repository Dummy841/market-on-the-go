import { Farmer, Product, Transaction } from './types';

export const mockFarmers: Farmer[] = [
  {
    id: '1',
    name: 'John Doe',
    phone: '9876543210',
    address: '123 Farm Road, Countryside',
    accountNumber: '1234567890',
    bankName: 'Agricultural Bank',
    ifscCode: 'AGRI0001234',
    dateJoined: new Date('2023-01-15'),
    products: [],
    transactions: [],
    email: 'john@example.com',
    password: 'password123', // In a real app, you would never store plain text passwords
    state: 'Karnataka',
    district: 'Bangalore',
    village: 'Whitefield',
    profilePhoto: undefined
  },
  {
    id: '2',
    name: 'Jane Smith',
    phone: '8765432109',
    address: '456 Harvest Lane, Greenfield',
    accountNumber: '0987654321',
    bankName: 'Rural Development Bank',
    ifscCode: 'RURAL002345',
    dateJoined: new Date('2023-03-22'),
    products: [],
    transactions: [],
    email: 'jane@example.com',
    password: 'password123',
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Hinjewadi',
    profilePhoto: undefined
  },
  {
    id: '3',
    name: 'Robert Green',
    phone: '7654321098',
    address: '789 Orchard Path, Fruitville',
    accountNumber: '5678901234',
    bankName: 'Farmers Credit Union',
    ifscCode: 'FCU00987',
    dateJoined: new Date('2023-05-10'),
    products: [],
    transactions: [],
    email: 'robert@example.com',
    password: 'password123',
    state: 'Tamil Nadu',
    district: 'Chennai',
    village: 'Adyar',
    profilePhoto: undefined
  }
];

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Wheat',
    quantity: 500,
    unit: 'kg',
    pricePerUnit: 25,
    category: 'Grains',
    date: new Date('2023-06-15'),
    farmerId: '1'
  },
  {
    id: '2',
    name: 'Rice',
    quantity: 300,
    unit: 'kg',
    pricePerUnit: 35,
    category: 'Grains',
    date: new Date('2023-06-20'),
    farmerId: '1'
  },
  {
    id: '3',
    name: 'Tomatoes',
    quantity: 200,
    unit: 'kg',
    pricePerUnit: 20,
    category: 'Vegetables',
    date: new Date('2023-07-05'),
    farmerId: '2'
  },
  {
    id: '4',
    name: 'Potatoes',
    quantity: 450,
    unit: 'kg',
    pricePerUnit: 15,
    category: 'Vegetables',
    date: new Date('2023-07-10'),
    farmerId: '2'
  },
  {
    id: '5',
    name: 'Apples',
    quantity: 150,
    unit: 'kg',
    pricePerUnit: 60,
    category: 'Fruits',
    date: new Date('2023-07-15'),
    farmerId: '3'
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    amount: 12500,
    date: new Date('2023-06-15'),
    type: 'credit',
    description: 'Wheat delivery',
    farmerId: '1',
    settled: true
  },
  {
    id: '2',
    amount: 10500,
    date: new Date('2023-06-20'),
    type: 'credit',
    description: 'Rice delivery',
    farmerId: '1',
    settled: false
  },
  {
    id: '3',
    amount: 4000,
    date: new Date('2023-07-05'),
    type: 'credit',
    description: 'Tomatoes delivery',
    farmerId: '2',
    settled: true
  },
  {
    id: '4',
    amount: 6750,
    date: new Date('2023-07-10'),
    type: 'credit',
    description: 'Potatoes delivery',
    farmerId: '2',
    settled: false
  },
  {
    id: '5',
    amount: 9000,
    date: new Date('2023-07-15'),
    type: 'credit',
    description: 'Apples delivery',
    farmerId: '3',
    settled: true
  },
  {
    id: '6',
    amount: 12500,
    date: new Date('2023-06-16'),
    type: 'debit',
    description: 'Payment settled',
    farmerId: '1',
    settled: true
  },
  {
    id: '7',
    amount: 4000,
    date: new Date('2023-07-06'),
    type: 'debit',
    description: 'Payment settled',
    farmerId: '2',
    settled: true
  },
  {
    id: '8',
    amount: 9000,
    date: new Date('2023-07-16'),
    type: 'debit',
    description: 'Payment settled',
    farmerId: '3',
    settled: true
  }
];

// Initialize farmer products and transactions
mockFarmers.forEach(farmer => {
  farmer.products = mockProducts.filter(product => product.farmerId === farmer.id);
  farmer.transactions = mockTransactions.filter(transaction => transaction.farmerId === farmer.id);
});

// Extended location data for all India states
export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal"
];

export const DISTRICTS: Record<string, string[]> = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
  "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davangere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
  "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Tamil Nadu": ["Ariyalur", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Salem", "Sivaganga", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"]
};

export const VILLAGES: Record<string, Record<string, string[]>> = {
  "Karnataka": {
    "Bengaluru Urban": ["Whitefield", "Electronic City", "Yelahanka", "Kengeri", "Hebbal", "Marathahalli", "HSR Layout"],
    "Mysuru": ["Chamundi Hills", "Srirangapatna", "T Narasipura", "Nanjangud", "Hunsur"],
    "Ballari": ["Sandur", "Hospet", "Kampli", "Kudligi", "Hadagalli"]
  },
  "Maharashtra": {
    "Pune": ["Hinjewadi", "Wagholi", "Kharadi", "Baner", "Magarpatta", "Hadapsar", "Kothrud"],
    "Mumbai Suburban": ["Andheri", "Borivali", "Bandra", "Malad", "Goregaon", "Kandivali", "Kurla"],
    "Nagpur": ["Dharampeth", "Sadar", "Civil Lines", "Nandanvan", "Mankapur"]
  },
  "Tamil Nadu": {
    "Chennai": ["Adyar", "Anna Nagar", "T. Nagar", "Velachery", "Mylapore", "Porur", "Besant Nagar"],
    "Coimbatore": ["Peelamedu", "RS Puram", "Saibaba Colony", "Ganapathy", "Singanallur"],
    "Madurai": ["Arapalayam", "Goripalayam", "Mattuthavani", "Tirupparankundram", "Villapuram"]
  }
};

// Helper functions
export const getDailyEarnings = (farmerId: string) => {
  const transactions = mockTransactions.filter(t => t.farmerId === farmerId && t.type === 'credit');
  const dailyMap = new Map();
  
  transactions.forEach(transaction => {
    const dateStr = transaction.date.toISOString().split('T')[0];
    const existing = dailyMap.get(dateStr) || 0;
    dailyMap.set(dateStr, existing + transaction.amount);
  });
  
  return Array.from(dailyMap.entries()).map(([date, amount]) => ({
    date,
    amount
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const getMonthlyEarnings = (farmerId: string) => {
  const transactions = mockTransactions.filter(t => t.farmerId === farmerId && t.type === 'credit');
  const monthlyMap = new Map();
  
  transactions.forEach(transaction => {
    const date = transaction.date;
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyMap.get(monthYear) || 0;
    monthlyMap.set(monthYear, existing + transaction.amount);
  });
  
  return Array.from(monthlyMap.entries()).map(([month, amount]) => ({
    month,
    amount
  })).sort((a, b) => a.month.localeCompare(b.month));
};

export const getUnsettledAmount = (farmerId: string) => {
  const transactions = mockTransactions.filter(t => t.farmerId === farmerId);
  let balance = 0;
  
  transactions.forEach(transaction => {
    if (transaction.type === 'credit') {
      balance += transaction.amount;
    } else if (transaction.type === 'debit') {
      balance -= transaction.amount;
    }
  });
  
  return balance;
};

// Shopping cart type for sales
export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  unit: string;
  category: string;
}

export interface Customer {
  name: string;
  mobile: string;
  email?: string;
}
