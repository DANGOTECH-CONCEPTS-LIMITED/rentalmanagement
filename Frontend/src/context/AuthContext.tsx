import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import axios from "axios";

interface User {
  verified: boolean;
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  token: string;
  systemRoleId: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (
    email: string,
    password: string
  ) => Promise<{
    systemRoleId: number;
    requiresPasswordChange: boolean;
  }>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  showPasswordModal: boolean;
  setShowPasswordModal: (show: boolean) => void;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Properly exported useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Properly exported AuthProvider
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
  }, []);

  // Initialize auth state from storage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser) as User;
      if (parsedUser.token) {
        setUser(parsedUser);
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${parsedUser.token}`;
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post<User>(
        `${import.meta.env.VITE_API_BASE_URL}/AuthenticateUser`,
        { userName: email, password }
      );

      if (!response.data.token) {
        throw new Error("Authentication failed: No token received");
      }

      const userData = {
        id: response.data.id,
        fullName: response.data.fullName,
        email: response.data.email,
        phoneNumber: response.data.phoneNumber,
        token: response.data.token,
        systemRoleId: response.data.systemRoleId,
        verified: response.data.verified,
      };

      setUser(userData);

      localStorage.setItem("user", JSON.stringify(userData));
      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${userData.token}`;

      return {
        systemRoleId: userData.systemRoleId,
        requiresPasswordChange: !userData.verified,
      };
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.status >= 400
          ? err.response.data
          : "Login failed. Please try again."
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    try {
      if (!user) throw new Error("No user logged in");

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/ChangePassword`, {
        currentPassword,
        newPassword,
        userName: user.email,
      });

      // Update user verification status
      setUser((prev) => (prev ? { ...prev, verified: true } : null));
      setShowPasswordModal(false);
    } catch (error) {
      throw new Error(
        axios.isAxiosError(error)
          ? error.response?.data
          : "Password change failed"
      );
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setLoading(true);
      console.log("email", email);
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/ForgotPassword`,
        JSON.stringify(email), // wraps the email in quotes, becomes a JSON string
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      throw new Error(
        axios.isAxiosError(error)
          ? error.response?.data || error.response.data
          : "Failed to send reset email"
      );
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    try {
      setLoading(true);

      const response = await axios.post<User>(
        `${import.meta.env.VITE_API_BASE_URL}/AuthenticateUser`,
        {
          userName: sessionStorage.getItem("resetEmail"),
          password: currentPassword,
        }
      );

      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${response.data.token}`;

      if (!response.data.token) {
        throw new Error("Authentication failed: No token received");
      }

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/ChangePassword`, {
        currentPassword,
        newPassword,
        userName: response.data.email,
      });
    } catch (error) {
      throw new Error(
        axios.isAxiosError(error)
          ? error.response?.data
          : "Password reset failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    isAuthenticated: !!user?.token,
    user,
    login,
    logout,
    loading,
    error,
    showPasswordModal,
    setShowPasswordModal,
    changePassword,
    forgotPassword,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
