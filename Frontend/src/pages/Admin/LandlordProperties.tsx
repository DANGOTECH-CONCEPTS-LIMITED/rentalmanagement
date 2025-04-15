"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { House, Search, Eye, Edit, Trash, XIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

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
  owner: {
    id: number;
    fullName: string;
    email: string;
    phoneNumber: string;
  };
}

const LandlordProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYmlvbmF0bGluZUBnbWFpbC5jb20iLCJqdGkiOiI1MzFkNDI4Ny1lOWU3LTRiMTMtYjE2YS03ZGUzZDY3YmM1YzIiLCJleHAiOjE3NDQ2Njc3MTMsImlzcyI6IkRBTkdPVEVDSCBDT05DRVBUUyBMSU1JVEVEIiwiYXVkIjoiTllVTUJBWU8gQ0xJRU5UUyJ9.I34A4KOCJQxeQx102Kw716TVuMGNh7bC3D4njbcfFWc";

  useEffect(() => {
    
    const fetchProperties = async () => {
         
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiUrl) {
      throw new Error("API base URL is not configured");
    }

      try {
        const response = await fetch(`{apiUrl}/GetAllProperties`, {
          method: 'GET',
          headers: {
            'accept': '*/*',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setProperties(data);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError('Failed to load properties. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, [token]);

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.owner.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteProperty = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiUrl) {
      throw new Error("API base URL is not configured");
    }
    
    
    try {
      const response = await fetch(`apiUrl/DeleteProperty/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete property');
      }

      setProperties(properties.filter(property => property.id !== id));
      toast({
        title: 'Success',
        description: 'Property deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting property:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete property',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-0">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Landlord Properties</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View and manage all properties registered in the system</p>
        </div>
        <Button onClick={() => window.location.href = '/admin-dashboard/register-property'} className="w-full sm:w-auto">
          Add New Property
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex items-center relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by property name, address, or landlord..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {error ? (
            <div className="py-8 text-center text-red-500">
              {error}
            </div>
          ) : isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-pulse">Loading properties...</div>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <House className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No properties found</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm ? 'Try adjusting your search query' : 'Start by adding a new property'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property Name</TableHead>
                    <TableHead className="hidden md:table-cell">Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Rooms</TableHead>
                    <TableHead>Landlord</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">{property.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{property.address}</TableCell>
                      <TableCell>{property.type}</TableCell>
                      <TableCell className="hidden md:table-cell">{property.numberOfRooms}</TableCell>
                      <TableCell>{property.owner.fullName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSelectedProperty(property)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => window.location.href = `/admin-dashboard/edit-property/${property.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="text-red-500"
                            onClick={() => handleDeleteProperty(property.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-full sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">{selectedProperty.name}</h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedProperty(null)}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm sm:text-base font-medium text-gray-500">Property Details</h3>
                    <p className="mt-1"><span className="font-medium">Address:</span> {selectedProperty.address}</p>
                    <p className="mt-1"><span className="font-medium">Type:</span> {selectedProperty.type}</p>
                    <p className="mt-1"><span className="font-medium">Rooms:</span> {selectedProperty.numberOfRooms}</p>
                    <p className="mt-1"><span className="font-medium">Price:</span> {selectedProperty.price} {selectedProperty.currency}</p>
                    <p className="mt-1"><span className="font-medium">Description:</span> {selectedProperty.description}</p>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-medium text-gray-500">Landlord Information</h3>
                    <p className="mt-1"><span className="font-medium">Name:</span> {selectedProperty.owner.fullName}</p>
                    <p className="mt-1"><span className="font-medium">Email:</span> {selectedProperty.owner.email}</p>
                    <p className="mt-1"><span className="font-medium">Phone:</span> {selectedProperty.owner.phoneNumber}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-medium text-gray-500 mb-2">Property Image</h3>
                  <img
                    src={`http://3.216.182.63:8091/${selectedProperty.imageUrl}`}
                    alt={selectedProperty.name}
                    className="rounded-md w-full h-64 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-property.jpg';
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end mt-6 space-y-2 sm:space-x-2 sm:space-y-0">
                <Button variant="outline" onClick={() => setSelectedProperty(null)} className="w-full sm:w-auto">
                  Close
                </Button>
                <Button 
                  className="w-full sm:w-auto"
                  onClick={() => window.location.href = `/admin-dashboard/edit-property/${selectedProperty.id}`}
                >
                  Edit Property
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandlordProperties;