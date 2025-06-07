import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAllEmployees } from '@/utils/employeeData';
import { Employee } from '@/utils/employeeData';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/Sidebar';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import EmployeeTable from '@/components/employees/EmployeeTable';
import AddEmployeeDialog from '@/components/employees/AddEmployeeDialog';
import EditEmployeeDialog from '@/components/employees/EditEmployeeDialog';
import { EmployeeFormData } from '@/components/employees/EmployeeFormBase';

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { checkPermission } = useAuth();
  
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'sales_executive',
    state: '',
    district: '',
    village: '',
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: ''
  });

  // Load employees on component mount
  useEffect(() => {
    const loadEmployees = () => {
      console.log('Loading all employees...');
      const allEmployees = getAllEmployees();
      console.log('Loaded employees:', allEmployees);
      setEmployees(allEmployees);
    };

    loadEmployees();
    
    // Listen for storage changes to update employee list
    const handleStorageChange = () => {
      loadEmployees();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const handleFormDataChange = (data: Partial<EmployeeFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...data
    }));
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'sales_executive',
      state: '',
      district: '',
      village: '',
      profilePhoto: '',
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: ''
    });
    setSelectedEmployee(null);
    setShowPassword(false);
  };
  
  const validateForm = () => {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return false;
    }
    
    // Validate phone (10 digits, starting with proper range)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast({
        title: "Invalid phone number",
        description: "Phone number must be 10 digits and start with 6-9",
        variant: "destructive"
      });
      return false;
    }

    // Only validate bank details if they're provided
    if (formData.accountNumber) {
      const accountNumberRegex = /^\d{9,18}$/;
      if (!accountNumberRegex.test(formData.accountNumber)) {
        toast({
          title: "Invalid account number",
          description: "Account number should be 9-18 digits",
          variant: "destructive"
        });
        return false;
      }
    }

    if (formData.ifscCode) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(formData.ifscCode)) {
        toast({
          title: "Invalid IFSC code",
          description: "Please enter a valid IFSC code",
          variant: "destructive"
        });
        return false;
      }
    }
    
    return true;
  };
  
  const handleAddEmployee = () => {
    if (!validateForm()) return;
    
    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: formData.role,
      state: formData.state,
      district: formData.district, 
      village: formData.village,
      profilePhoto: formData.profilePhoto,
      accountHolderName: formData.accountHolderName,
      accountNumber: formData.accountNumber,
      bankName: formData.bankName,
      ifscCode: formData.ifscCode,
      dateJoined: new Date()
    };
    
    // Get existing registered employees
    const registeredEmployees = localStorage.getItem('registeredEmployees');
    const parsedEmployees = registeredEmployees ? JSON.parse(registeredEmployees) : [];
    
    // Add new employee to registered employees
    const updatedRegisteredEmployees = [...parsedEmployees, newEmployee];
    localStorage.setItem('registeredEmployees', JSON.stringify(updatedRegisteredEmployees));
    
    // Update local state with all employees
    const allEmployees = getAllEmployees();
    setEmployees(allEmployees);
    
    setIsAddDialogOpen(false);
    resetForm();
    
    console.log('Employee added:', newEmployee);
    toast({
      title: "Employee added",
      description: `${formData.name} was successfully added as ${formData.role} and can now log in.`
    });
  };
  
  const handleAddDialogCancel = () => {
    setIsAddDialogOpen(false);
    resetForm();
  };
  
  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '',
      password: employee.password || '',
      role: employee.role,
      state: employee.state || '',
      district: employee.district || '',
      village: employee.village || '',
      profilePhoto: employee.profilePhoto,
      accountHolderName: employee.accountHolderName || '',
      accountNumber: employee.accountNumber || '',
      bankName: employee.bankName || '',
      ifscCode: employee.ifscCode || ''
    });
    setIsEditDialogOpen(true);
  };
  
  const handleEditDialogCancel = () => {
    setIsEditDialogOpen(false);
    resetForm();
  };
  
  const handleUpdateEmployee = () => {
    if (!selectedEmployee || !validateForm()) return;
    
    const updatedEmployees = employees.map(emp => {
      if (emp.id === selectedEmployee.id) {
        return {
          ...emp,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
          state: formData.state,
          district: formData.district,
          village: formData.village,
          profilePhoto: formData.profilePhoto,
          accountHolderName: formData.accountHolderName,
          accountNumber: formData.accountNumber,
          bankName: formData.bankName,
          ifscCode: formData.ifscCode
        };
      }
      return emp;
    });
    
    setEmployees(updatedEmployees);
    
    // Update in localStorage
    const registeredEmployees = localStorage.getItem('registeredEmployees');
    if (registeredEmployees) {
      const parsedEmployees = JSON.parse(registeredEmployees);
      const updatedStoredEmployees = parsedEmployees.map((emp: Employee) => {
        if (emp.id === selectedEmployee.id) {
          return {
            ...emp,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            role: formData.role,
            state: formData.state,
            district: formData.district,
            village: formData.village,
            profilePhoto: formData.profilePhoto,
            accountHolderName: formData.accountHolderName,
            accountNumber: formData.accountNumber,
            bankName: formData.bankName,
            ifscCode: formData.ifscCode
          };
        }
        return emp;
      });
      localStorage.setItem('registeredEmployees', JSON.stringify(updatedStoredEmployees));
    }
    
    setIsEditDialogOpen(false);
    resetForm();
    
    toast({
      title: "Employee updated",
      description: `${formData.name}'s information was successfully updated.`
    });
  };
  
  const handleDeleteEmployee = (id: string) => {
    const updatedEmployees = employees.filter(emp => emp.id !== id);
    setEmployees(updatedEmployees);
    
    // Update in localStorage
    const registeredEmployees = localStorage.getItem('registeredEmployees');
    if (registeredEmployees) {
      const parsedEmployees = JSON.parse(registeredEmployees);
      const updatedStoredEmployees = parsedEmployees.filter((emp: Employee) => emp.id !== id);
      localStorage.setItem('registeredEmployees', JSON.stringify(updatedStoredEmployees));
    }
    
    toast({
      title: "Employee removed",
      description: "The employee record has been deleted."
    });
  };
  
  const canCreate = checkPermission('employees', 'create');
  const canEdit = checkPermission('employees', 'edit');
  const canDelete = checkPermission('employees', 'delete');
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Employees</h1>
            {canCreate && (
              <Button 
                className="bg-agri-primary hover:bg-agri-secondary flex gap-2"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4" /> Add Employee
              </Button>
            )}
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Employee List ({employees.length} total)</CardTitle>
            </CardHeader>
            <CardContent>
              <EmployeeTable
                employees={employees}
                onEditClick={handleEditClick}
                onDeleteEmployee={handleDeleteEmployee}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            </CardContent>
          </Card>
        </main>
      </div>
      
      {/* Add Employee Dialog */}
      <AddEmployeeDialog
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        formData={formData}
        onChange={handleFormDataChange}
        showPassword={showPassword}
        togglePasswordVisibility={togglePasswordVisibility}
        onAddEmployee={handleAddEmployee}
        onCancel={handleAddDialogCancel}
      />
      
      {/* Edit Employee Dialog */}
      <EditEmployeeDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        formData={formData}
        onChange={handleFormDataChange}
        showPassword={showPassword}
        togglePasswordVisibility={togglePasswordVisibility}
        onUpdateEmployee={handleUpdateEmployee}
        onCancel={handleEditDialogCancel}
      />
    </SidebarProvider>
  );
};

export default Employees;
