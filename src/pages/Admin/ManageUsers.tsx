
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Edit, Trash, Search } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "landlord" | "tenant";
  status: "active" | "inactive";
}

const ManageUsers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users] = useState<User[]>([
    { id: "1", name: "Jojo J", email: "Jojo@example.com", role: "landlord", status: "active" },
    { id: "2", name: "Jane N", email: "jane@example.com", role: "tenant", status: "active" },
    { id: "3", name: "Samson S", email: "sam@example.com", role: "tenant", status: "inactive" },
    { id: "4", name: "Alice Brown", email: "alice@example.com", role: "landlord", status: "active" },
    { id: "5", name: "Talie A", email: "talie@example.com", role: "admin", status: "active" },
    { id: "6", name: "Lara A", email: "lara@example.com", role: "tenant", status: "active" },
  ]);

  const getFilteredUsers = (role: string | null = null) => {
    return users.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (role) {
        return matchesSearch && user.role === role;
      }
      
      return matchesSearch;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manage Users</h1>
        <p className="text-muted-foreground">View and manage system users</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button>Add New User</Button>
      </div>

      <Card>
        <Tabs defaultValue="all" className="p-4">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Users ({getFilteredUsers().length})</TabsTrigger>
            <TabsTrigger value="admin">Admins ({getFilteredUsers("admin").length})</TabsTrigger>
            <TabsTrigger value="landlord">Landlords ({getFilteredUsers("landlord").length})</TabsTrigger>
            <TabsTrigger value="tenant">Tenants ({getFilteredUsers("tenant").length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <UserTable users={getFilteredUsers()} />
          </TabsContent>
          
          <TabsContent value="admin">
            <UserTable users={getFilteredUsers("admin")} />
          </TabsContent>
          
          <TabsContent value="landlord">
            <UserTable users={getFilteredUsers("landlord")} />
          </TabsContent>
          
          <TabsContent value="tenant">
            <UserTable users={getFilteredUsers("tenant")} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

const UserTable = ({ users }: { users: User[] }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
              No users found
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge 
                  variant={user.role === "admin" ? "destructive" : user.role === "landlord" ? "default" : "secondary"}
                >
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                {user.status === "active" ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-4 w-4" /> Inactive
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default ManageUsers;
