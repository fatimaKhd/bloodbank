
import { UserRole, Permission, hasPermission } from "./roles";
import { toast } from "sonner";

// Session management
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const getUserRole = (): UserRole | null => {
  const role = localStorage.getItem('userRole');
  if (role === 'admin' || role === 'hospital' || role === 'donor') {
    return role as UserRole;
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const isAuthorized = (requiredPermission: Permission): boolean => {
  const userRole = getUserRole();
  if (!userRole) return false;
  return hasPermission(userRole, requiredPermission);
};

// Login, logout and registration handlers
// In your auth helper (auth.js or similar)
export const login = async (email: string, password: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: 'Login successful',
        userRole: result.role,
        token: result.token,
        user_id: result.user_id // ✅ Include user_id from backend
      };
    } else {
      return { success: false, message: result.error || 'Login failed' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'An error occurred, please try again' };
  }
};




export const logout = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('userId');
  toast.info("Logged out successfully");
};


export const register = async (data: any) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      return { success: true, message: 'Registration successful' };
    } else {
      return { success: false, message: result.error || 'Registration failed' };
    }
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'An error occurred, please try again' };
  }
};


// User profile management
export const getUserProfile = () => {
  const role = getUserRole();
  const name = localStorage.getItem('userName') || 'User';

  return {
    name,
    email: role === 'admin' ? 'admin@lifeflow.com' :
      role === 'hospital' ? 'hospital@lifeflow.com' :
        `${name.toLowerCase()}@example.com`,
    role: role || 'guest',
    lastLogin: new Date().toISOString(),
    permissions: role ? (role === 'admin' ? 'All permissions' :
      role === 'hospital' ? 'Hospital permissions' :
        'Donor permissions') : 'None'
  };
};

// Protected route helper
export const requireAuth = (navigate: (path: string) => void): void => {
  if (!isAuthenticated()) {
    toast.error("Authentication required", {
      description: "Please log in to access this page.",
    });
    navigate('/auth');
  }
};

export const getDashboardMenuItems = (role: UserRole): { title: string, url: string, icon: string }[] => {
  const commonItems = [
    { title: 'Overview', url: '/dashboard', icon: 'layout-dashboard' },
    { title: 'Profile', url: '/dashboard/pr ofile', icon: 'user' },
  ];

  if (role === 'admin') {
    return [
      ...commonItems,
      { title: 'Users', url: '/dashboard/users', icon: 'users' },
      { title: 'Inventory', url: '/dashboard/inventory', icon: 'box' },
      { title: 'Blood Requests', url: '/dashboard/requests', icon: 'clipboard-list' },
      { title: 'Analytics', url: '/dashboard/analytics', icon: 'bar-chart' },
      { title: 'Settings', url: '/dashboard/settings', icon: 'settings' },
    ];
  } else if (role === 'hospital') {
    return [
      ...commonItems,
      { title: 'Blood Inventory', url: '/dashboard/inventory', icon: 'droplet' },
      { title: 'Request Blood', url: '/dashboard/request', icon: 'clipboard-list' },
      { title: 'Patients', url: '/dashboard/patients', icon: 'user-plus' },
      { title: 'Reports', url: '/dashboard/reports', icon: 'file-text' },
    ];
  } else {
    // Donor
    return [
      ...commonItems,
      { title: 'Schedule Donation', url: '/dashboard/schedule', icon: 'calendar' },
      { title: 'Donation History', url: '/dashboard/history', icon: 'clock' },
      { title: 'Rewards', url: '/dashboard/rewards', icon: 'award' },
      { title: 'Find Centers', url: '/dashboard/centers', icon: 'map-pin' },
    ];
  }
};
