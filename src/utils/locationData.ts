
// Sample location data for India
export const states: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kakinada"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Durg", "Bilaspur", "Korba"],
  "Goa": ["Panaji", "Vasco da Gama", "Margao", "Mapusa", "Ponda"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar"],
  "Haryana": ["Faridabad", "Gurgaon", "Panipat", "Ambala", "Yamunanagar", "Rohtak"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Kullu"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum", "Gulbarga"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur"],
  "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur"],
  "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongstoin"],
  "Mizoram": ["Aizawl", "Lunglei", "Saiha", "Champhai"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer"],
  "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Mangan"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar", "Kailasahar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Allahabad", "Ghaziabad"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Rishikesh", "Haldwani"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"]
};

// Sample districts data
export const districts: Record<string, string[]> = {
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Amravati", "Kolhapur", "Thane", "Raigad"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum", "Gulbarga", "Davanagere", "Shimoga", "Tumkur", "Udupi"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Erode", "Vellore", "Thanjavur"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Kutch", "Anand"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Alwar", "Sikar", "Bharatpur", "Pali"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Allahabad", "Ghaziabad", "Noida", "Meerut", "Bareilly", "Aligarh"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kakinada", "Rajahmundry", "Kurnool", "Kadapa", "Anantapur"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Kannur", "Kottayam", "Malappuram"]
  // Add more states and districts as needed
};

// Sample villages data
export const villages: Record<string, string[]> = {
  "Mumbai": ["Dharavi", "Bandra", "Andheri", "Juhu", "Dadar", "Worli", "Kurla", "Malad", "Goregaon", "Borivali", "Kandivali"],
  "Pune": ["Hinjewadi", "Kothrud", "Hadapsar", "Baner", "Aundh", "Viman Nagar", "Koregaon Park", "Shivajinagar", "Kharadi", "Wagholi", "Pimpri"],
  "Bangalore": ["Whitefield", "Electronic City", "Jayanagar", "Indiranagar", "Koramangala", "BTM Layout", "HSR Layout", "Malleshwaram", "Hebbal", "Bannerghatta"],
  "Chennai": ["Adyar", "T. Nagar", "Mylapore", "Anna Nagar", "Besant Nagar", "Velachery", "Tambaram", "Porur", "Sholinganallur", "Guindy", "Perambur"],
  "Jaipur": ["Mansarovar", "Malviya Nagar", "Vaishali Nagar", "Jagatpura", "Sanganer", "Jawahar Nagar", "Bani Park", "Vidhyadhar Nagar", "Civil Lines", "Jhotwara"],
  "Hyderabad": ["Gachibowli", "HITEC City", "Jubilee Hills", "Banjara Hills", "Madhapur", "Kukatpally", "Secunderabad", "Dilsukhnagar", "Ameerpet", "Begumpet"],
  "Ahmedabad": ["Satellite", "Bopal", "Navrangpura", "Vastrapur", "Paldi", "Maninagar", "Thaltej", "Bodakdev", "Gota", "Chandkheda"],
  "Kolkata": ["Park Street", "Salt Lake", "New Town", "Ballygunge", "Alipore", "Bhowanipore", "Tollygunge", "Dum Dum", "Behala", "Howrah"],
  "Visakhapatnam": ["Dwaraka Nagar", "Madhurawada", "Gajuwaka", "MVP Colony", "Arilova", "Seethammadhara", "Gopalapatnam", "Murali Nagar", "Rushikonda", "Pendurthi"]
  // Add more districts and villages as needed
};

// Common banks in India
export const banks = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Bank of India",
  "Union Bank of India",
  "IndusInd Bank",
  "Kotak Mahindra Bank",
  "Yes Bank",
  "Central Bank of India",
  "Indian Overseas Bank",
  "IDBI Bank",
  "Federal Bank",
  "South Indian Bank",
  "UCO Bank",
  "Karnataka Bank",
  "Bandhan Bank",
  "RBL Bank"
];
