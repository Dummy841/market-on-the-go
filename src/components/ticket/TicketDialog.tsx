
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import TicketForm from './TicketForm';
import { Ticket as TicketIcon } from 'lucide-react';

interface TicketDialogProps {
  userType: 'farmer' | 'customer';
  userId: string;
  userName: string;
  userContact: string;
  onSubmit: (ticket: {
    user_id: string;
    user_type: string;
    user_name: string;
    user_contact: string;
    message: string;
    status: string;
    attachment_url?: string;
  }) => void;
  buttonText?: string;
}

const TicketDialog: React.FC<TicketDialogProps> = ({
  userType,
  userId,
  userName,
  userContact,
  onSubmit,
  buttonText = "Raise a Ticket"
}) => {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (ticket: {
    user_id: string;
    user_type: string;
    user_name: string;
    user_contact: string;
    message: string;
    status: string;
    attachment_url?: string;
  }) => {
    onSubmit(ticket);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <TicketIcon className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <TicketForm
          userType={userType}
          userId={userId}
          userName={userName}
          userContact={userContact}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default TicketDialog;
