
import React, { useState } from 'react';
import { Ticket } from '@/utils/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { File, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TicketManagementProps {
  tickets: Ticket[];
  onUpdateTicket: (updatedTicket: Ticket) => void;
}

const TicketManagement: React.FC<TicketManagementProps> = ({ tickets, onUpdateTicket }) => {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState<Ticket['status']>('pending');

  const filteredTickets = statusFilter === 'all' 
    ? tickets 
    : tickets.filter(ticket => ticket.status === statusFilter);

  const openTicketDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setResolution(ticket.resolution || '');
    setNewStatus(ticket.status);
  };

  const handleUpdateTicket = () => {
    if (selectedTicket) {
      const updatedTicket: Ticket = {
        ...selectedTicket,
        status: newStatus,
        resolution: resolution.trim() || undefined,
        lastUpdated: new Date()
      };
      
      onUpdateTicket(updatedTicket);
      setSelectedTicket(null);
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100">Pending</Badge>;
      case 'in-review':
        return <Badge variant="outline" className="bg-blue-100">In Review</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-green-100">Closed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Support Tickets</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-review">In Review</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {filteredTickets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No tickets found
        </div>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Ticket ID</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">#{ticket.id}</TableCell>
                  <TableCell>{format(new Date(ticket.dateCreated), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{ticket.userName}</TableCell>
                  <TableCell className="capitalize">{ticket.userType}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{ticket.message}</TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openTicketDetails(ticket)}
                      className="gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Ticket details dialog */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh]">
            <ScrollArea className="max-h-[80vh] pr-4">
              <DialogHeader>
                <DialogTitle>Ticket #{selectedTicket.id}</DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">User</Label>
                    <p className="font-medium">{selectedTicket.userName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Contact</Label>
                    <p className="font-medium">{selectedTicket.userContact}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p className="font-medium capitalize">{selectedTicket.userType}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date Created</Label>
                    <p className="font-medium">
                      {format(new Date(selectedTicket.dateCreated), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Message</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <p>{selectedTicket.message}</p>
                  </div>
                </div>
                
                {selectedTicket.attachmentUrl && (
                  <div>
                    <Label className="text-muted-foreground">Attachment</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md flex items-center">
                      <File className="h-4 w-4 mr-2" />
                      <a 
                        href={selectedTicket.attachmentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Attachment
                      </a>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newStatus} onValueChange={(value) => setNewStatus(value as Ticket['status'])}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-review">In Review</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="resolution">Resolution / Comments</Label>
                  <Textarea 
                    id="resolution" 
                    placeholder="Add resolution details or comments..." 
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTicket}>
                Update Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TicketManagement;
