import { useState, useEffect } from 'react';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Bell, Calendar, AlertTriangle, CheckCircle, Clock, Loader2, Search } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';

interface Notification {
  recipient: string;
  subject?: string;
  message: string;
  event: string;
  bloodType?: string;
  units?: number;
  timestamp: string;
  type: 'email' | 'sms' | 'app';
  status: 'sent' | 'failed' | 'pending';
}

const NotificationHistoryPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');

    if (!token) {
      navigate('/auth');
      return;
    }

    setUserRole(role);

    const fetchNotifications = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/notifications', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch notifications');
        const data = await res.json();
        setNotifications(data);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [navigate]);

  const filteredNotifications = notifications.filter(notification => {
    const searchLower = searchTerm.toLowerCase();
    return (
      notification.recipient.toLowerCase().includes(searchLower) ||
      (notification.subject?.toLowerCase().includes(searchLower)) ||
      notification.message.toLowerCase().includes(searchLower) ||
      notification.event.toLowerCase().includes(searchLower) ||
      (notification.bloodType?.toLowerCase().includes(searchLower))
    );
  });

  const getEventIcon = (event: string) => {
    switch (event) {
      case 'lowStock': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'donation': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'appointment': return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'eligibility': return <Clock className="h-5 w-5 text-purple-500" />;
      case 'request': return <Bell className="h-5 w-5 text-bloodRed-600" />;
      default: return <Mail className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: true
    }).format(date);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Notification History</h1>
              <p className="text-gray-600">
                Track all emails notifications sent through the system
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Notification Log</CardTitle>
              <CardDescription>
                {userRole === 'admin' ? 'All notifications sent to donors, hospitals, and staff' : 'Your notifications only'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    placeholder="Search notifications..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-bloodRed-600 mr-3" />
                    <span>Loading notification history...</span>
                  </div>
                ) : filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="mr-4 mt-1">{getEventIcon(notification.event)}</div>
                        <div className="flex-grow">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
                            <h3 className="font-medium">{notification.subject || `${notification.event.charAt(0).toUpperCase() + notification.event.slice(1)} Notification`}</h3>
                            <div className="flex items-center mt-2 sm:mt-0">
                              <Badge variant={notification.status === 'sent' ? 'default' : notification.status === 'pending' ? 'outline' : 'destructive'}>
                                {notification.status}
                              </Badge>
                              <Badge variant="outline" className="ml-2">
                                {notification.type.toUpperCase()}
                              </Badge>
                              {notification.bloodType && (
                                <Badge className="ml-2 bg-bloodRed-50 text-bloodRed-600 hover:bg-bloodRed-100">
                                  {notification.bloodType}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <p className="text-gray-600 text-sm mb-3">{notification.message}</p>

                          <div className="flex flex-col sm:flex-row text-xs text-gray-500">
                            <div className="flex items-center">
                              <Mail className="h-3.5 w-3.5 mr-1" />
                              <span>To: {notification.recipient}</span>
                            </div>
                            <Separator orientation="vertical" className="hidden sm:block mx-2 h-4" />
                            <div className="flex items-center mt-1 sm:mt-0">
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              <span>{formatTimestamp(notification.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-700 mb-1">No notifications found</h3>
                    <p className="text-gray-500">
                      {searchTerm ? "No results for your search" : "No notifications sent yet"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotificationHistoryPage;
