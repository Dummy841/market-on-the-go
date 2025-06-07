
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
import { ArrowLeft } from 'lucide-react';

interface EditEmployeeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  formData: EmployeeFormData;
  onChange: (data: Partial<EmployeeFormData>) => void;
  showPassword: boolean;
  togglePasswordVisibility: () => void;
  onUpdateEmployee: () => void;
  onCancel: () => void;
}

const EditEmployeeDialog: React.FC<EditEmployeeDialogProps> = ({
  isOpen,
  setIsOpen,
  formData,
  onChange,
  showPassword,
  togglePasswordVisibility,
  onUpdateEmployee,
  onCancel
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="flex flex-row items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2" 
            onClick={onCancel}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information and permissions.
            </DialogDescription>
          </div>
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
          <Button onClick={onUpdateEmployee}>Update Employee</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployeeDialog;
