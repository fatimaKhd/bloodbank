import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { Hospital, CalendarIcon, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


export const DonorAppointment = () => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState<string>("");
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [donorId, setDonorId] = useState<string>("");
  const [bloodType, setBloodType] = useState<string>("");
  const queryClient = useQueryClient();


  useEffect(() => {
    const storedDonorId = localStorage.getItem('donorId');
    if (storedDonorId) {
      setDonorId(storedDonorId);
    }
  }, []);

  // Fetch donation centers
  const { data: bloodCenters = [] } = useQuery({
    queryKey: ['donationCenters'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/donation_centers`);
        if (!response.ok) {
          throw new Error('Failed to fetch donation centers');
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching donation centers:", error);
        toast.error("Failed to load donation centers");
        return [];
      }
    }
  });

  // Get current user and their donor profile
  // Get current user and their donor profile
  // const { data: userDonorProfile, isLoading: loadingProfile } = useQuery({
  //   queryKey: ['currentDonorProfile'],
  //   queryFn: async () => {
  //     const token = localStorage.getItem('authToken'); // Get the token from localStorage

  //     if (!token) {
  //       return null; // Return null if there's no token
  //     }

  //     // Fetch user profile from your backend API
  //     const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user/profile`, {
  //       method: 'GET',
  //       headers: {
  //         'Authorization': `Bearer ${token}`, // Pass the token for authentication
  //       },
  //     });

  //     if (!response.ok) {
  //       console.error('Error fetching user profile');
  //       return null;
  //     }

  //     const userData = await response.json();

  //     // Get the donor profile from your backend API as well
  //     const donorResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/donor/profile/${userData.id}`, {
  //       method: 'GET',
  //       headers: {
  //         'Authorization': `Bearer ${token}`, // Pass the token for authentication
  //       },
  //     });

  //     if (!donorResponse.ok) {
  //       console.error('Error fetching donor profile');
  //       return null;
  //     }

  //     const donorProfile = await donorResponse.json();

  //     setDonorId(donorProfile.id);
  //     setBloodType(donorProfile.blood_type);

  //     return {
  //       userId: userData.id,
  //       profile: userData,
  //       donorProfile: donorProfile,
  //     };
  //   },
  // });


  const createAppointment = useMutation({
    mutationFn: async () => {
      if (!date || !location || !timeSlot || !donorId) {
        throw new Error("Required information is missing");
      }

      const token = localStorage.getItem('authToken');  // Get token from localStorage

      if (!token) {
        throw new Error("Token is missing");
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,  // Pass the token for authentication
        },
        body: JSON.stringify({
          donor_id: donorId,
          center_id: location,
          appointment_date: date.toISOString(),
          time_slot: timeSlot,
          status: 'scheduled',
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create appointment");
      }

      const data = await response.json();
      return data;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });

      // Reset form
      setDate(undefined);
      setLocation("");
      setTimeSlot("");

      // Show success message
      toast.success("Appointment scheduled successfully!");

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('appointmentScheduled', {
        detail: {
          id: data.id,
          date: format(new Date(data.appointment_date), "yyyy-MM-dd"),
          formattedDate: format(new Date(data.appointment_date), "MMMM d, yyyy"),
          location: bloodCenters.find(c => c.id === data.center_id)?.name,
          timeSlot: data.time_slot,
          status: data.status,
        }
      }));
    },

    onError: (error) => {
      console.error("Error scheduling appointment:", error);

      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Full stack trace:", error.stack);
        toast.error(error.message || "Failed to schedule appointment");
      } else if (typeof error === 'object') {
        console.error("Unknown error object:", JSON.stringify(error, null, 2));
        toast.error("Unexpected error occurred while scheduling.");
      } else {
        console.error("Non-object error:", error);
        toast.error("An unknown error occurred.");
      }
    }
    ,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !location || !timeSlot) {
      toast.error("Please fill in all fields", {
        description: "All fields are required to schedule an appointment.",
      });
      return;
    }

    if (!donorId) {
      toast.error("You must be registered as a donor", {
        description: "Please complete your donor profile first.",
      });
      return;
    }

    createAppointment.mutate();
  };

  // Generate time slots
  const timeSlots = [
    "09:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "01:00 PM", "02:00 PM",
    "03:00 PM", "04:00 PM", "05:00 PM"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule a Donation Appointment</CardTitle>
        <CardDescription>Select your preferred date, time and location</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Donation Center</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger id="location" className="w-full">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {bloodCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    <div className="flex items-center">
                      <Hospital className="h-4 w-4 mr-2" />
                      {center.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Appointment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${!date && 'text-muted-foreground'}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="pointer-events-auto"
                  disabled={(date) => {
                    // Disable dates in the past and more than 30 days in the future
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const maxDate = new Date();
                    maxDate.setDate(maxDate.getDate() + 30);

                    return date < today || date > maxDate;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeSlot">Time Slot</Label>
            <Select value={timeSlot} onValueChange={setTimeSlot} disabled={!date}>
              <SelectTrigger id="timeSlot" className="w-full">
                <SelectValue placeholder="Select a time slot" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-bloodRed-600 hover:bg-bloodRed-700 mt-4"
            disabled={createAppointment.isPending || !date || !location || !timeSlot || !donorId}
          >
            {createAppointment.isPending ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Schedule Appointment'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col text-sm text-gray-500 border-t pt-4">
        <div className="flex items-start mb-2">
          <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
          <p>You can cancel or reschedule up to 24 hours before your appointment.</p>
        </div>
        <div className="flex items-start">
          <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
          <p>Please bring a valid ID and arrive 15 minutes before your appointment.</p>
        </div>
      </CardFooter>
    </Card>
  );
};