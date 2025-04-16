import { useState } from "react";

import { X, Lock, Key } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Button from "../ui/button/Button";

interface PasswordChangeModalProps {
  onSuccess?: () => void;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  onSuccess,
}) => {
  const { showPasswordModal, setShowPasswordModal, changePassword, user } =
    useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await changePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      onSuccess?.(); // Call the success handler
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setLoading(false);
    }
  };

  if (!showPasswordModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">Change Password</h3>
          <button
            onClick={() => setShowPasswordModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Current Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <Lock size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pl-10 input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <Key size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 input-field"
                required
                minLength={4}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <Key size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 input-field"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-4" isLoading={loading}>
            Change Password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
