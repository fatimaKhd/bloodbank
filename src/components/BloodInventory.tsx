import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Clock,
  Droplet,
  FileText,
  Filter,
  Plus,
  Search
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

interface InventoryItem {
  id: string;
  bloodType: BloodType;
  units: number;
  expiryDate: string;
  donationDate: string;
  status: 'available' | 'reserved' | 'used' | 'expired';
  locationName?: string;
}

interface BloodInventoryProps {
  simpleView?: boolean;
}

export const BloodInventory = ({ simpleView = false }: BloodInventoryProps) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBloodType, setFilterBloodType] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [showAddInventoryDialog, setShowAddInventoryDialog] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]); // Fix duplicate state declaration
  const [loading, setLoading] = useState<boolean>(true);
  const [locations, setLocations] = useState<{ id: string, name: string }[]>([]); // Fix duplicate state declaration

  // Form state for adding new inventory
  const [newInventory, setNewInventory] = useState({
    bloodType: 'A+' as BloodType,
    units: 1,
    expiryDate: '',
    donationDate: new Date().toISOString().split('T')[0],
    locationId: '',
    status: 'available'
  });

  // Fetch inventory data from the database
  useEffect(() => {
    const fetchInventoryData = async () => {
      setLoading(true);
      try {
        // Fetch locations first
        const responseLocations = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/donation_centers`);
        if (!responseLocations.ok) throw new Error('Failed to fetch locations');
        const locationsData = await responseLocations.json();
        setLocations(locationsData || []);

        // Fetch blood inventory
        const responseInventory = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/inventory`);
        if (!responseInventory.ok) throw new Error('Failed to fetch blood inventory');
        const data = await responseInventory.json();

        const ML_PER_UNIT = 450;

        const mappedData = data.map(item => {
          const units = Math.floor(item.units / ML_PER_UNIT); // Convert ml to units

          return {
            id: item.id,
            bloodType: item.blood_type as BloodType,
            units: units, // Now using converted units
            expiryDate: item.expiry_date.split('T')[0],
            donationDate: item.donation_date ? item.donation_date.split('T')[0] : 'N/A',
            status: item.status as 'available' | 'reserved' | 'used' | 'expired',
            locationName: item.location_name || 'Central Blood Bank',
          };
        });


        setInventoryData(mappedData);
      } catch (error) {
        console.error('Error fetching blood inventory:', error);
        toast.error('Failed to load blood inventory data');
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();

    // If you want to set up periodic polling for real-time updates (instead of using Supabase)
    const interval = setInterval(() => {
      fetchInventoryData();  // Poll the server every 30 seconds
    }, 30000); // 30 seconds interval for fetching updates

    // Clean up the interval when component unmounts
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Function to handle adding new inventory
  const handleAddInventory = async () => {
    try {
      if (!newInventory.expiryDate) {
        toast.error('Please provide an expiry date');
        return;
      }

      // Validate
      if (newInventory.units < 1) {
        toast.error('Units must be at least 1');
        return;
      }

      // Calculate automatic expiry date if not provided (42 days from donation)
      let expiryDate = newInventory.expiryDate;
      if (!expiryDate) {
        const donationDate = new Date(newInventory.donationDate);
        donationDate.setDate(donationDate.getDate() + 42); // Blood typically expires in 42 days
        expiryDate = donationDate.toISOString().split('T')[0];
      }

      // Prepare the data for the request
      const inventoryData = {
        blood_type: newInventory.bloodType,
        units: newInventory.units,
        expiry_date: new Date(expiryDate).toISOString(),
        donation_date: new Date(newInventory.donationDate).toISOString(),
        location_id: newInventory.locationId || null,
        location_name: newInventory.locationId
          ? locations.find((loc) => loc.id === newInventory.locationId)?.name
          : 'Central Blood Bank',
        status: 'available',
      };

      // Send data to the backend API (Replace with your actual backend endpoint)
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/blood_inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inventoryData),
      });

      if (!response.ok) {
        throw new Error('Failed to add blood inventory');
      }

      const result = await response.json();

      toast.success('Blood inventory added successfully');
      setShowAddInventoryDialog(false);

      // Reset form
      setNewInventory({
        bloodType: 'A+' as BloodType,
        units: 1,
        expiryDate: '',
        donationDate: new Date().toISOString().split('T')[0],
        locationId: '',
        status: 'available',
      });
    } catch (error) {
      console.error('Error adding blood inventory:', error);
      toast.error('Failed to add blood inventory');
    }
  };

  // Calculate aggregated statistics
  const totalUnits = inventoryData.reduce((sum, item) => sum + item.units, 0);
  const totalByBloodType: Record<BloodType, number> = {
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
  };

  inventoryData.forEach(item => {
    totalByBloodType[item.bloodType] += item.units;
  });

  // Filter inventory data
  const filteredInventory = inventoryData.filter(item => {
    const matchesSearch =
      item.bloodType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.locationName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.expiryDate.includes(searchQuery);

    const matchesBloodType = !filterBloodType || filterBloodType === 'all' || item.bloodType === filterBloodType;
    const matchesLocation = !filterLocation || filterLocation === 'all' || item.locationName === filterLocation;

    return matchesSearch && matchesBloodType && matchesLocation;
  });

  // Check for expiring inventory (within 7 days)
  const today = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(today.getDate() + 7);

  const expiringItems = inventoryData.filter(item => {
    const expiryDate = new Date(item.expiryDate);
    return expiryDate > today && expiryDate <= sevenDaysLater;
  });

  // Get unique locations for filter
  const uniqueLocations = Array.from(new Set(inventoryData.map(item => item.locationName))).filter(Boolean) as string[];

  // If simpleView is true, render a simplified version
  if (simpleView) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(totalByBloodType).map(([bloodType, units]) => (
          <Card key={bloodType}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Blood Type {bloodType}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{units} units</div>
              <Progress
                className="h-2 mt-2"
                value={(units / (totalUnits || 1)) * 100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((units / (totalUnits || 1)) * 100)}% of total inventory
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(totalByBloodType).map(([bloodType, units]) => (
              <Card key={bloodType}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Blood Type {bloodType}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{units} units</div>
                  <Progress className="h-2 mt-2" value={(units / (totalUnits || 1)) * 100} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((units / (totalUnits || 1)) * 100)}% of total inventory
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Blood Type</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Donation Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.bloodType}</TableCell>
                  <TableCell>{item.units}</TableCell>
                  <TableCell>{item.donationDate}</TableCell>
                  <TableCell>{item.expiryDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{item.status}</Badge>
                  </TableCell>
                  <TableCell>{item.locationName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="expiring">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Blood Type</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiringItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.bloodType}</TableCell>
                  <TableCell>{item.units}</TableCell>
                  <TableCell>{item.expiryDate}</TableCell>
                  <TableCell>{item.locationName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Add Inventory Dialog */}
      <Dialog open={showAddInventoryDialog} onOpenChange={setShowAddInventoryDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Blood Inventory</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bloodType" className="text-right">Type</Label>
              <Select
                value={newInventory.bloodType}
                onValueChange={(val) => setNewInventory({ ...newInventory, bloodType: val as BloodType })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="units" className="text-right">Units</Label>
              <Input
                id="units"
                type="number"
                className="col-span-3"
                value={newInventory.units}
                onChange={(e) => setNewInventory({ ...newInventory, units: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="donationDate" className="text-right">Donation Date</Label>
              <Input
                id="donationDate"
                type="date"
                className="col-span-3"
                value={newInventory.donationDate}
                onChange={(e) => setNewInventory({ ...newInventory, donationDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expiryDate" className="text-right">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                className="col-span-3"
                value={newInventory.expiryDate}
                onChange={(e) => setNewInventory({ ...newInventory, expiryDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">Location</Label>
              <Select
                value={newInventory.locationId}
                onValueChange={(val) => setNewInventory({ ...newInventory, locationId: val })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddInventory}>Add to Inventory</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
};

export default BloodInventory;
