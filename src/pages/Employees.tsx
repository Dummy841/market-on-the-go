
import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { UserPlus } from 'lucide-react';
import EmployeeTable from '@/components/employees/EmployeeTable';
import AddEmployeeDialog from '@/components/employees/AddEmployeeDialog';
import EditEmployeeDialog from '@/components/employees/EditEmployeeDialog';
import { EmployeeFormData } from '@/components/employees/EmployeeFormBase';
import { useEmployees, Employee } from '@/hooks/useEmployees';

const Employees = () => {
  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { checkPermission } = useAuth();
  
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'sales',
    state: '',
    district: '',
    village: '',
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: ''
  });
  
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
      role: 'sales',
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
      return false;
    }
    
    // Validate phone (10 digits, starting with proper range)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      return false;
    }

    // Only validate bank details if they're provided
    if (formData.accountNumber) {
      const accountNumberRegex = /^\d{9,18}$/;
      if (!accountNumberRegex.test(formData.accountNumber)) {
        return false;
      }
    }

    if (formData.ifscCode) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(formData.ifscCode)) {
        return false;
      }
    }
    
    return true;
  };
  
  const handleAddEmployee = async () => {
    if (!validateForm()) return;
    
    const employeeData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: formData.role,
      state: formData.state,
      district: formData.district, 
      village: formData.village,
      profile_photo: formData.profilePhoto,
      account_holder_name: formData.accountHolderName,
      account_number: formData.accountNumber,
      bank_name: formData.bankName,
      ifsc_code: formData.ifscCode
    };
    
    const result = await addEmployee(employeeData);
    
    if (result.success) {
      setIsAddDialogOpen(false);
      resetForm();
    }
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
      profilePhoto: employee.profile_photo,
      accountHolderName: employee.account_holder_name || '',
      accountNumber: employee.account_number || '',
      bankName: employee.bank_name || '',
      ifscCode: employee.ifsc_code || ''
    });
    setIsEditDialogOpen(true);
  };
  
  const handleEditDialogCancel = () => {
    setIsEditDialogOpen(false);
    resetForm();
  };
  
  const handleUpdateEmployee = async () => {
    if (!selectedEmployee || !validateForm()) return;
    
    const employeeData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: formData.role,
      state: formData.state,
      district: formData.district,
      village: formData.village,
      profile_photo: formData.profilePhoto,
      account_holder_name: formData.accountHolderName,
      account_number: formData.accountNumber,
      bank_name: formData.bankName,
      ifsc_code: formData.ifscCode
    };
    
    const result = await updateEmployee(selectedEmployee.id, employeeData);
    
    if (result.success) {
      setIsEditDialogOpen(false);
      resetForm();
    }
  };
  
  const handleDeleteEmployee = async (id: string) => {
    await deleteEmployee(id);
  };
  
  const canCreate = checkPermission('employees', 'create');
  const canEdit = checkPermission('employees', 'edit');
  const canDelete = checkPermission('employees', 'delete');
  
  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <Sidebar />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="flex justify-center items-center h-64">
              <div className="text-lg">Loading employees...</div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }
  
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
