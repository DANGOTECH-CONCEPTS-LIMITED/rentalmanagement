import { useAuth } from "@/context/AuthContext";
import AdminUtilityAccountWorkspace from "@/components/AdminUtilityAccountWorkspace";
import AdminUtilityWallet from "@/components/AdminUtilityWallet";

export default function UtilityAccountManagement() {
  const { user } = useAuth();

  if (!user?.token || user.systemRoleId !== 1) {
    return <p role="alert">An administrator session is required.</p>;
  }

  return (
    <AdminUtilityAccountWorkspace
      apiUrl={import.meta.env.VITE_API_BASE_URL}
      authToken={user.token}
      renderWallet={(account) => (
        <AdminUtilityWallet account={account} apiUrl={import.meta.env.VITE_API_BASE_URL} authToken={user.token} />
      )}
    />
  );
}
