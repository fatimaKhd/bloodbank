import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const DonorManagement = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [userId, setUserId] = useState("");
  const [donorId, setDonorId] = useState("");
  const [isEligible, setIsEligible] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState("");
  const queryClient = useQueryClient();

  const { data: donors = [], isLoading: loadingDonors } = useQuery({
    queryKey: ['donors'],
    queryFn: async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/v1/donors`);
        if (!res.ok) throw new Error("Failed to fetch donors");
        const data = await res.json();
        return data.map((row) => ({
          id: row[0],
          name: row[1],
          email: row[2],
          userId: row[3],
          bloodType: row[4],
          lastDonationDate: row[5] ? format(new Date(row[5]), 'MMMM dd, yyyy') : 'Never',
          medicalHistory: row[6],
        }));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load donors");
        return [];
      }
    }
  });

  const updateDonor = useMutation({
    mutationFn: async () => {
      if (!donorId) throw new Error("Missing donor ID");
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/v1/donors/${donorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          blood_type: bloodType,
          eligible_to_donate: isEligible,
          medical_history: medicalHistory || ""
        })
      });
      if (!res.ok) throw new Error("Failed to update donor");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      setName(""); setEmail(""); setBloodType(""); setIsEligible(false); setMedicalHistory(""); setDonorId("");
      toast.success("Donor updated successfully");
    },
    onError: () => toast.error("Failed to update donor")
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDonor.mutate();
  };

  const handleEdit = (donor: any) => {
    setDonorId(donor.id);
    setName(donor.name);
    setEmail(donor.email);
    setBloodType(donor.bloodType);
    setIsEligible(true);
    setMedicalHistory(donor.medicalHistory);
    setUserId(donor.userId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Donor Management</CardTitle>
        <CardDescription>Update donor profiles</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bloodType">Blood Type</Label>
            <Select value={bloodType} onValueChange={setBloodType}>
              <SelectTrigger id="bloodType">
                <SelectValue placeholder="Select blood type" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="medicalHistory">Medical History</Label>
            <Input id="medicalHistory" value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} />
          </div>
          <Button type="submit" className="w-full">Update Donor</Button>
        </form>
      </CardContent>
      <CardFooter>
        <div className="w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Donation</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingDonors ? (
                <tr>
                  <td colSpan={5} className="text-center px-6 py-4">Loading...</td>
                </tr>
              ) : (
                donors.map((donor) => (
                  <tr key={donor.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{donor.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donor.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donor.bloodType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{donor.lastDonationDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(donor)}>
                        <UserPlus className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DonorManagement;
