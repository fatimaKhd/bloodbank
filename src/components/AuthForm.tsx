import { ZodError, ZodIssueCode, ZodCustomIssue } from 'zod';
import { useState } from 'react';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import {
  User, UserPlus, LogIn, Mail, Lock, Heart, AlertCircle,
  Building, MapPin, Phone, Droplet, Eye, EyeOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { login, register } from "@/lib/auth";
import { UserRole } from "@/lib/roles";
import { z } from 'zod';

// Separate validation schemas for donor and hospital registration
const donorRegistrationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  dateOfBirth: z.string(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']),
  medicalConditions: z.string(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number" }),
  address: z.string(),
  hasDonatedBefore: z.boolean(),
  lastDonation: z.string().nullable(),  // use nullable for `null` if needed
  nextEligible: z.string().nullable(),
  healthStatus: z.string()
}).superRefine((data, ctx) => {
  if (data.hasDonatedBefore === false && data.lastDonation) {
    ctx.addIssue({
      path: ['lastDonation'],
      code: z.ZodIssueCode.custom,
      message: 'Last donation cannot be provided if donor has never donated'
    });
  }
  if (data.hasDonatedBefore === false && data.nextEligible) {
    ctx.addIssue({
      path: ['nextEligible'],
      code: z.ZodIssueCode.custom,
      message: 'Next eligible date cannot be provided if donor has never donated'
    });
  }
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});





const hospitalRegistrationSchema = z.object({
  hospitalName: z.string().min(2, { message: "Hospital name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number" }),
  licenseNumber: z.string().min(3, { message: "License number must be at least 3 characters" })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type DonorRegistrationData = z.infer<typeof donorRegistrationSchema>;
type HospitalRegistrationData = z.infer<typeof hospitalRegistrationSchema>;

// Define a common interface with properties that both types share
interface CommonFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

// Define a union type with discriminator (userRole) to help TypeScript distinguish between the types
type FormData =
  | (CommonFormData & {
    userRole: 'donor';
    name: string;
    bloodType: string;
    gender: string;
    dateOfBirth: string;
    medicalConditions: string;
    phone?: string;   // Add phone here for donor form
    address?: string; // Add address here for donor form
    lastDonation?: string;
    nextEligible?: string;
    healthStatus?: string;
    hasDonatedBefore?: boolean;  // Add this new field to track if they have donated before
    hospitalName?: never;
    licenseNumber?: never;
  })
  | (CommonFormData & {
    userRole: 'hospital';
    hospitalName: string;
    address: string;
    phone: string;
    licenseNumber: string;
    name?: never;
    bloodType?: never;
    gender?: never;
    dateOfBirth?: never;
    medicalConditions?: never;
  });



export const AuthForm = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('donor');

  const navigate = useNavigate();

  // Initialize form data based on role
  const [formData, setFormData] = useState<FormData>(
    userRole === 'donor'
      ? {
        userRole: 'donor',
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        bloodType: '',
        gender: '',
        dateOfBirth: '',
        medicalConditions: '',
        hasDonatedBefore: false, // ✅ required
        lastDonation: null,
        nextEligible: null
      }
      : {
        userRole: 'hospital',
        email: '',
        password: '',
        confirmPassword: '',
        hospitalName: '',
        address: '',
        phone: '',
        licenseNumber: ''
      }
  );

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("We need your email to send reset instructions.");
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json();
      toast.success(data.message || "A reset password has been sent.");

    } catch (error) {
      toast.error("Something went wrong while resetting your password");
      // toast.error("We need your email to send reset instructions.");

    }
  };


  // Update form data when role changes
  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);

    // Reset form data based on new role
    setFormData(
      role === 'donor'
        ? {
          userRole: 'donor',
          email: '',
          password: '',
          confirmPassword: '',
          name: '',
          bloodType: '',
          gender: '',
          dateOfBirth: '',
          medicalConditions: ''
        }
        : {
          userRole: 'hospital',
          email: '',
          password: '',
          confirmPassword: '',
          hospitalName: '',
          address: '',
          phone: '',
          licenseNumber: ''
        }
    );

    setValidationErrors({});
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => {
      const updated = { ...prev };

      // Handle checkbox logic only for donor forms
      if (type === 'checkbox') {
        updated[name as keyof typeof updated] = checked as any;

        // Safely reset donor-only fields using type guard
        if (isDonorForm(updated)) {
          updated.lastDonation = checked ? '' : null;
          updated.nextEligible = checked ? '' : null;
        }
      } else {
        updated[name as keyof typeof updated] = value as any;
      }

      return updated;
    });
  };




  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setLoading(true);

    try {
      if (mode === 'login') {
        // Handle login
        const { success, message, token, user_id, userRole } = await login(formData.email, formData.password);

        if (success) {
          localStorage.setItem('authToken', token);
          localStorage.setItem('userRole', userRole);
          if (userRole == 'donor') {
            localStorage.setItem('donorId', user_id);
          }
          localStorage.setItem('userName', formData.email);
          localStorage.setItem('userId', user_id.toString()); // ✅ General ID

          if (userRole === 'hospital') {
            localStorage.setItem('hospitalId', user_id.toString()); // ✅ Specific hospital ID
          }

          setUserRole(userRole); // ✅ Set the React state correctly


          navigate('/dashboard');
        } else {
          toast.error(message); // Show error message from login
        }
      } else {
        // Handle registration based on role
        if (formData.userRole === 'donor') {
          const donorData = {
            userRole: formData.userRole, // Add userRole here
            name: formData.name,
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
            bloodType: formData.bloodType as any,
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender as any,
            medicalConditions: formData.medicalConditions,
            phone: formData.phone,  // Add phone here if present
            address: formData.address, // Add address here if present
            lastDonation: formData.hasDonatedBefore ? formData.lastDonation : null,
            nextEligible: formData.hasDonatedBefore ? formData.nextEligible : null,
            healthStatus: formData.healthStatus,
            hasDonatedBefore: formData.hasDonatedBefore
          };

          const result = donorRegistrationSchema.safeParse(donorData);
          console.log(result); // ⬅ Check what it's returning


          if (!result.success) {
            const errors: Record<string, string> = {};
            result.error.errors.forEach((err) => {
              errors[err.path[0] as string] = err.message;
            });
            setValidationErrors(errors);
            setLoading(false);
            return;
          }

          // Call the register function for donors
          const { success, message } = await register(donorData);

          if (success) {
            setMode('login');
            handleRoleChange('donor');
            toast.success(message); // Show success message after successful registration
          } else {
            toast.error(message); // Show error message if registration fails
          }
        } else {
          // Handle hospital registration
          const hospitalData = {
            userRole: formData.userRole, // Add userRole here
            hospitalName: formData.hospitalName,
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
            address: formData.address,
            phone: formData.phone,
            licenseNumber: formData.licenseNumber
          };

          const result = hospitalRegistrationSchema.safeParse(hospitalData);

          if (!result.success) {
            const errors: Record<string, string> = {};
            result.error.errors.forEach((err) => {
              errors[err.path[0] as string] = err.message;
            });
            setValidationErrors(errors);
            setLoading(false);
            return;
          }

          // Call the register function for hospitals
          const { success, message } = await register(hospitalData);

          if (success) {
            setMode('login');
            handleRoleChange('hospital');
            toast.success(message); // Show success message after successful registration
          } else {
            toast.error(message); // Show error message if registration fails
          }
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  // Animation variants
  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  };

  // Blood type options
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // Type guard helper functions
  const isDonorForm = (form: FormData): form is FormData & { userRole: 'donor' } => {
    return form.userRole === 'donor';
  };

  const isHospitalForm = (form: FormData): form is FormData & { userRole: 'hospital' } => {
    return form.userRole === 'hospital';
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Auth Mode Toggle */}
      <div className="bg-gray-100 p-1 rounded-lg flex mb-6">
        <button
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex justify-center items-center ${mode === 'login'
            ? 'bg-white shadow-sm text-gray-800'
            : 'text-gray-600 hover:text-gray-800'
            }`}
          onClick={() => setMode('login')}
        >
          <LogIn className="h-4 w-4 mr-2" />
          Sign In
        </button>
        <button
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex justify-center items-center ${mode === 'register'
            ? 'bg-white shadow-sm text-gray-800'
            : 'text-gray-600 hover:text-gray-800'
            }`}
          onClick={() => setMode('register')}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Register
        </button>
      </div>

      {/* Form Container */}
      <motion.div
        key={mode}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={formVariants}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <div className="text-center mb-6">
          <Heart className="h-10 w-10 text-bloodRed-600 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'login' ? 'Welcome Back' : 'Join LifeFlow'}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {mode === 'login'
              ? 'Sign in to access your account'
              : userRole === 'donor'
                ? 'Create an account to start donating'
                : 'Register your hospital with our system'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User type selection for both login and register */}
          {(mode === 'register' || mode === 'login') && (
            <div className="space-y-2">
              <Label>I am a:</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={userRole === 'donor' ? 'default' : 'outline'}
                  className={`
                    border-2 h-auto py-3 px-2 flex flex-col items-center
                    ${userRole === 'donor' ? 'bg-bloodRed-600 hover:bg-bloodRed-700 border-transparent' : 'border-gray-200 hover:border-gray-300'}
                  `}
                  onClick={() => handleRoleChange('donor')}
                >
                  <User className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">Donor</span>
                </Button>
                <Button
                  type="button"
                  variant={userRole === 'hospital' ? 'default' : 'outline'}
                  className={`
                    border-2 h-auto py-3 px-2 flex flex-col items-center
                    ${userRole === 'hospital' ? 'bg-bloodRed-600 hover:bg-bloodRed-700 border-transparent' : 'border-gray-200 hover:border-gray-300'}
                  `}
                  onClick={() => handleRoleChange('hospital')}
                >
                  <Building className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">Hospital</span>
                </Button>
              </div>
            </div>
          )}

          {/* Register Form Fields - Show different fields based on role */}
          {mode === 'register' && (
            <>
              {isDonorForm(formData) ? (
                // Donor specific registration fields
                <>
                  <div className="space-y-1">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Enter full name"
                        className="pl-10"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {validationErrors.name && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="bloodType">Blood Type</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Droplet className="h-4 w-4 text-gray-400" />
                        </div>
                        <select
                          id="bloodType"
                          name="bloodType"
                          className="pl-10 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={formData.bloodType}
                          onChange={handleChange}
                        >
                          <option value="">Select</option>
                          {bloodTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      {validationErrors.bloodType && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.bloodType}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                      />
                      {validationErrors.dateOfBirth && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.dateOfBirth}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Phone className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        className="pl-10"
                        value={formData.phone || ''}
                        onChange={handleChange}
                      />
                    </div>
                    {validationErrors.phone && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.phone}</p>
                    )}
                  </div>

                  {/* Address field */}
                  <div className="space-y-1">
                    <Label htmlFor="address">Address</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <MapPin className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="address"
                        name="address"
                        type="text"
                        placeholder="123 Main Street"
                        className="pl-10"
                        value={formData.address || ''}
                        onChange={handleChange}
                      />
                    </div>
                    {validationErrors.address && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.address}</p>
                    )}
                  </div>

                  {/* Donation History Check */}
                  <div className="space-y-1">
                    <Label htmlFor="hasDonatedBefore">Have you donated before?</Label>
                    <input
                      type="checkbox"
                      id="hasDonatedBefore"
                      name="hasDonatedBefore"
                      checked={formData.hasDonatedBefore || false}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Last Donation Date */}
                  {formData.hasDonatedBefore && (
                    <div className="space-y-1">
                      <Label htmlFor="lastDonation">Last Donation Date</Label>
                      <Input
                        id="lastDonation"
                        name="lastDonation"
                        type="date"
                        value={formData.lastDonation || ''}
                        onChange={handleChange}
                      />
                      {validationErrors.lastDonation && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.lastDonation}</p>
                      )}
                    </div>
                  )}

                  {/* Next Eligible Donation */}
                  {formData.hasDonatedBefore && (
                    <div className="space-y-1">
                      <Label htmlFor="nextEligible">Next Eligible Donation Date</Label>
                      <Input
                        id="nextEligible"
                        name="nextEligible"
                        type="date"
                        value={formData.nextEligible || ''}
                        onChange={handleChange}
                      />
                      {validationErrors.nextEligible && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.nextEligible}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="healthStatus">Health Status</Label>
                    <Input
                      id="healthStatus"
                      name="healthStatus"
                      type="text"
                      placeholder="e.g. Fit, Anemic, etc."
                      value={formData.healthStatus}
                      onChange={handleChange}
                    />
                  </div>


                  <div className="space-y-1">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      name="gender"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.gender}
                      onChange={handleChange}
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                    {validationErrors.gender && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.gender}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="medicalConditions">
                      Medical Conditions <span className="text-xs text-gray-500">(Optional)</span>
                    </Label>
                    <Textarea
                      id="medicalConditions"
                      name="medicalConditions"
                      placeholder="List any relevant medical conditions"
                      value={formData.medicalConditions}
                      onChange={handleChange}
                    />
                  </div>
                </>
              ) : (
                // Hospital specific registration fields
                <>
                  <div className="space-y-1">
                    <Label htmlFor="hospitalName">Hospital Name</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Building className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="hospitalName"
                        name="hospitalName"
                        type="text"
                        placeholder="General Hospital"
                        className="pl-10"
                        value={formData.hospitalName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {validationErrors.hospitalName && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.hospitalName}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="address">Address</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <MapPin className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="address"
                        name="address"
                        type="text"
                        placeholder="123 Medical Center Dr, City, State"
                        className="pl-10"
                        value={formData.address}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {validationErrors.address && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.address}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Phone className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        className="pl-10"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {validationErrors.phone && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="licenseNumber">License/Registration Number</Label>
                    <Input
                      id="licenseNumber"
                      name="licenseNumber"
                      type="text"
                      placeholder="Enter hospital license number"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      required
                    />
                    {validationErrors.licenseNumber && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.licenseNumber}</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Common fields for both donor and hospital */}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            {validationErrors.email && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pl-10"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.password}</p>
            )}
          </div>

          {mode === 'register' && (
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>
          )}

          {mode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-bloodRed-600 hover:text-bloodRed-800 transition-colors underline"
              >
                Forgot password?
              </button>
            </div>
          )}


          <Button
            type="submit"
            className="w-full bg-bloodRed-600 hover:bg-bloodRed-700 h-11"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="mr-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                Processing...
              </>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </Button>
        </form>
      </motion.div>

  
    </div>
  );
};
