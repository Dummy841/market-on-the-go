
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EmployeeFormBase, { EmployeeFormData } from './EmployeeFormBase';

interface AddEmployeeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  formData: EmployeeFormData;
  onChange: (data: Partial<EmployeeFormData>) => void;
  showPassword: boolean;
  togglePasswordVisibility: () => void;
  onAddEmployee: () => void;
  onCancel: () => void;
}

const AddEmployeeDialog: React.FC<AddEmployeeDialogProps> = ({
  isOpen,
  setIsOpen,
  formData,
  onChange,
  showPassword,
  togglePasswordVisibility,
  onAddEmployee,
  onCancel
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Create a new employee account with role-based permissions.
          </DialogDescription>
        </DialogHeader>
        
        <EmployeeFormBase
          formData={formData}
          onChange={onChange}
          showPassword={showPassword}
          togglePasswordVisibility={togglePasswordVisibility}
        />
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onAddEmployee}>Create Employee</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeDialog;
