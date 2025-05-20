import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface DonorRequest {
    donation_id: number;
    donor_id: string;
    donor_name: string;
    blood_type: string;
    status: 'scheduled' | 'completed' | 'rejected';
    created_at: string;
}

export const DonorRequestManagement = () => {
    const [donorRequests, setDonorRequests] = useState<DonorRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('http://localhost:5000/api/admin/donor-requests', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to fetch requests');
            setDonorRequests(data);
        } catch (err) {
            toast.error('Error loading donor requests');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (donationId: number, action: 'approve' | 'reject' | 'missed') => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`http://localhost:5000/api/admin/${action}-donor/${donationId}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success(`Request ${action}d successfully`);
            fetchRequests();
        } catch (err) {
            toast.error(`Failed to ${action} request`);
            console.error(err);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Donor Requests</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p className="text-muted">Loading...</p>
                ) : donorRequests.length === 0 ? (
                    <div className="text-center py-8 border border-gray-200 rounded-md bg-gray-50">
                        <p className="text-gray-700 text-lg font-semibold">No donor requests available</p>
                        <p className="text-sm text-gray-500 mt-1">Once donations are scheduled, they’ll appear here.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Donor</TableHead>
                                <TableHead>Blood Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {donorRequests.map((request) => (
                                <TableRow key={request.donation_id}>
                                    <TableCell>{request.donation_id}</TableCell>
                                    <TableCell>{request.donor_name}</TableCell>
                                    <TableCell>{request.blood_type}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={request.status === 'completed' ? 'default' : 'outline'}
                                            className="capitalize"
                                        >
                                            {request.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {request.created_at
                                            ? new Date(request.created_at).toLocaleString()
                                            : '--'}
                                    </TableCell>
                                    <TableCell>
                                        {request.status === 'scheduled' ? (
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleAction(request.donation_id, 'approve')}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleAction(request.donation_id, 'reject')}
                                                >
                                                    Reject
                                                </Button>
                                                <Button
                                                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                                    onClick={() => handleAction(request.donation_id, 'missed')}
                                                >
                                                    Missed
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-muted">--</span>
                                        )}

                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};
