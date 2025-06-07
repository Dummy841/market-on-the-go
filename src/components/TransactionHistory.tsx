
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Transaction, DailyEarning, MonthlyEarning } from '@/utils/types';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TransactionHistoryProps {
  transactions: Transaction[];
  dailyEarnings: DailyEarning[];
  monthlyEarnings: MonthlyEarning[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ 
  transactions, 
  dailyEarnings, 
  monthlyEarnings 
}) => {
  const [tab, setTab] = useState('daily');

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  };
  
  // Format month for display
  const formatMonth = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    return `${new Date(0, parseInt(month) - 1).toLocaleString('default', { month: 'long' })} ${year}`;
  };

  // Format data for chart
  const dailyChartData = dailyEarnings.map(item => ({
    name: format(new Date(item.date), 'MMM dd'),
    amount: item.amount
  }));

  const monthlyChartData = monthlyEarnings.map(item => ({
    name: formatMonth(item.month).split(' ')[0], // Just the month name
    amount: item.amount
  }));
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Earnings History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full" onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="pt-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailyChartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`₹${value}`, 'Earnings']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="amount" name="Earnings (₹)" fill="#2E7D32" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">Daily Transaction Details</h4>
              <div className="border rounded-md max-h-60 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-right p-2">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyEarnings.length > 0 ? (
                      dailyEarnings.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-muted'}>
                          <td className="text-left p-2">{formatDate(item.date)}</td>
                          <td className="text-right p-2">₹{item.amount.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="text-center p-4">No daily earnings data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="monthly" className="pt-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyChartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`₹${value}`, 'Earnings']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="amount" name="Earnings (₹)" fill="#558B2F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">Monthly Transaction Details</h4>
              <div className="border rounded-md max-h-60 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="text-left p-2">Month</th>
                      <th className="text-right p-2">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyEarnings.length > 0 ? (
                      monthlyEarnings.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-muted'}>
                          <td className="text-left p-2">{formatMonth(item.month)}</td>
                          <td className="text-right p-2">₹{item.amount.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="text-center p-4">No monthly earnings data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;
