
import React from 'react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Pencil, Trash2, User } from 'lucide-react';
import { Employee } from '@/hooks/useEmployees';

interface EmployeeTableProps {
  employees: Employee[];
  onEditClick: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  onEditClick,
  onDeleteEmployee,
  canEdit,
  canDelete
}) => {
  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground text-lg mb-2">
          No employees found
        </div>
        <div className="text-sm text-muted-foreground">
          Add employees using the "Add Employee" button above
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Name</th>
            <th className="text-left p-2">Email</th>
            <th className="text-left p-2">Phone</th>
            <th className="text-left p-2">Role</th>
            <th className="text-left p-2">Location</th>
            <th className="text-left p-2">Date Joined</th>
            <th className="text-right p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id} className="border-b">
              <td className="p-2 flex items-center gap-2">
                <div className="bg-muted h-8 w-8 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                {employee.name}
              </td>
              <td className="p-2">{employee.email}</td>
              <td className="p-2">{employee.phone || 'Not provided'}</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  employee.role === 'admin' 
                    ? 'bg-red-100 text-red-700' 
                    : employee.role === 'manager'
                      ? 'bg-blue-100 text-blue-700'
                      : employee.role === 'sales'
                        ? 'bg-green-100 text-green-700'
                        : employee.role === 'accountant'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-purple-100 text-purple-700'
                }`}>
                  {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                </span>
              </td>
              <td className="p-2">
                {employee.state && employee.district ? 
                  `${employee.district}, ${employee.state}` : 
                  "Not specified"}
              </td>
              <td className="p-2">
                {employee.date_joined ? 
                  format(new Date(employee.date_joined), 'MMM dd, yyyy') : 
                  'Not available'}
              </td>
              <td className="p-2 text-right">
                <div className="flex justify-end gap-2">
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditClick(employee)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteEmployee(employee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeTable;
