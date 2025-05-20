import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthProvider"; // updated
import { requireAuth } from "@/lib/auth"; // keep if it's backend-protected route

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading, updateProfile, fetchProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await requireAuth(navigate); // optionally fetches /auth/me or checks token
        // Fetch profile data from backend after authentication
        await fetchProfile(); // Add a fetchProfile method that calls /auth/me and updates the profile in context
      } catch {
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate]); // added fetchProfile as dependency

  
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    const result = await updateProfile({
      name: name,
      phone: phone
    });

    if (result) {
      setIsEditing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16 pb-12 container mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter Name"
                  />
                </div>
             
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <Input 
                  value={user?.email || ''} 
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="flex justify-end space-x-4">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (profile) {
                          setName(profile.name || '');
                          setPhone(profile.phone || '');
                        }
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveProfile}>Save Profile</Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
