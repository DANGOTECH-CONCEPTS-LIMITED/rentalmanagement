import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarIcon, XIcon, UploadIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";

interface Property {
  id: number;
  name: string;
  type: string;
  address: string;
  region: string;
  district: string;
  zipcode: string;
  numberOfRooms: number;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  createdAt: string;
  ownerId: number;
  owner: {
    id: number;
    fullName: string;
    email: string;
    phoneNumber: string;
    // ... other owner fields
  };
}

interface Tenant {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  active: boolean;
  passportPhoto: string;
  idFront: string;
  idBack: string;
  nationalIdNumber: string;
  paymentStatus: string;
  balanceDue: number;
  arrears: number;
  nextPaymentDate: string;
  dateMovedIn: string;
  propertyId: number;
  property: {
    id: number;
    name: string;
    type: string;
    address: string;
    region: string;
    district: string;
    zipcode: string;
    numberOfRooms: number;
    description: string;
    imageUrl: string;
    price: number;
    currency: string;
    createdAt: string;
    ownerId: number;
    owner: {
      id: number;
      fullName: string;
      email: string;
      phoneNumber: string;
    };
  };
}

interface UpdateTenantModalProps {
  tenant: Tenant | null;
  properties: Property[];
  onClose: () => void;
  onUpdate: (updatedTenant: Tenant) => void;
}

const UpdateTenantModal = ({
  tenant,
  properties,
  onClose,
  onUpdate,
}: UpdateTenantModalProps) => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const [dateMovedIn, setDateMovedIn] = useState<Date | undefined>(
    tenant?.dateMovedIn ? new Date(tenant.dateMovedIn) : undefined
  );
  const [active, setActive] = useState(tenant?.active || false);
  const [files, setFiles] = useState<{
    passportPhoto?: File;
    idFront?: File;
    idBack?: File;
  }>({});
  const fileInputRefs = {
    passportPhoto: useRef<HTMLInputElement>(null),
    idFront: useRef<HTMLInputElement>(null),
    idBack: useRef<HTMLInputElement>(null),
  };

  const handleFileChange =
    (field: keyof typeof files) => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setFiles((prev) => ({ ...prev, [field]: e.target.files![0] }));
      }
    };

  const removeFile = (field: keyof typeof files) => () => {
    setFiles((prev) => ({ ...prev, [field]: undefined }));
    if (fileInputRefs[field].current) {
      fileInputRefs[field].current!.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    const formData = new FormData();
    formData.append("tenantid", tenant.id.toString());
    formData.append("Active", active.toString());
    formData.append("DateMovedIn", dateMovedIn?.toISOString() || "");
    formData.append("PropertyId", (e.currentTarget as any).propertyId.value);
    formData.append(
      "NationalIdNumber",
      (e.currentTarget as any).nationalIdNumber.value
    );
    formData.append("PhoneNumber", (e.currentTarget as any).phoneNumber.value);
    formData.append("FullName", (e.currentTarget as any).fullName.value);
    formData.append("Email", (e.currentTarget as any).email.value);

    if (files.passportPhoto) formData.append("files", files.passportPhoto);
    if (files.idFront) formData.append("files", files.idFront);
    if (files.idBack) formData.append("files", files.idBack);

    try {
      const token = localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user")!).token
        : null;
      if (!token) throw new Error("Authentication token not found");

      const response = await fetch(`${apiUrl}/UpdateTenant`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "*/*",
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to update tenant");

      const updatedTenant = await response.json();
      onUpdate(updatedTenant);
      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update tenant",
        variant: "destructive",
      });
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={!!tenant} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Tenant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" defaultValue={tenant.fullName} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={tenant.email}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  defaultValue={tenant.phoneNumber}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationalIdNumber">National ID Number</Label>
                <Input
                  id="nationalIdNumber"
                  defaultValue={tenant.nationalIdNumber}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="propertyId">Property</Label>
                <select
                  id="propertyId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue={tenant.propertyId}
                  required
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {/* - ({property.price} {property.currency}) */}
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Move-in Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateMovedIn ? (
                        format(dateMovedIn, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateMovedIn}
                      onSelect={setDateMovedIn}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={active}
                onCheckedChange={setActive}
              />
              <Label htmlFor="active">Active Tenant</Label>
            </div>

            {/* File upload sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Passport Photo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    ref={fileInputRefs.passportPhoto}
                    onChange={handleFileChange("passportPhoto")}
                    accept="image/*"
                    className="hidden"
                    id="passportPhoto"
                  />
                  <Label
                    htmlFor="passportPhoto"
                    className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground w-full"
                  >
                    <UploadIcon className="h-5 w-5 mb-1" />
                    <span className="text-sm">
                      {files.passportPhoto
                        ? files.passportPhoto.name
                        : "Upload"}
                    </span>
                  </Label>
                  {files.passportPhoto && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={removeFile("passportPhoto")}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {tenant.passportPhoto && !files.passportPhoto && (
                  <div className="text-xs text-muted-foreground">
                    Current: {tenant.passportPhoto.split("/").pop()}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>ID Front</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    ref={fileInputRefs.idFront}
                    onChange={handleFileChange("idFront")}
                    accept="image/*"
                    className="hidden"
                    id="idFront"
                  />
                  <Label
                    htmlFor="idFront"
                    className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground w-full"
                  >
                    <UploadIcon className="h-5 w-5 mb-1" />
                    <span className="text-sm">
                      {files.idFront ? files.idFront.name : "Upload"}
                    </span>
                  </Label>
                  {files.idFront && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={removeFile("idFront")}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {tenant.idFront && !files.idFront && (
                  <div className="text-xs text-muted-foreground">
                    Current: {tenant.idFront.split("/").pop()}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>ID Back</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    ref={fileInputRefs.idBack}
                    onChange={handleFileChange("idBack")}
                    accept="image/*"
                    className="hidden"
                    id="idBack"
                  />
                  <Label
                    htmlFor="idBack"
                    className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground w-full"
                  >
                    <UploadIcon className="h-5 w-5 mb-1" />
                    <span className="text-sm">
                      {files.idBack ? files.idBack.name : "Upload"}
                    </span>
                  </Label>
                  {files.idBack && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={removeFile("idBack")}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {tenant.idBack && !files.idBack && (
                  <div className="text-xs text-muted-foreground">
                    Current: {tenant.idBack.split("/").pop()}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateTenantModal;
